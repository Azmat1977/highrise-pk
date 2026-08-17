import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import { requireAuth } from '@/lib/requireAuth';
import { getOptionalAuth } from '@/lib/optionalAuth';
import {
  rateLimitDeveloper,
  rateLimitApi,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { deleteFiles, isHighrisePublicId } from '@/lib/cloudinary';
import { uploadValidatedTempFile, UploadValidationError } from '@/lib/secureFormidableUpload';

export const config = { api: { bodyParser: false } };

const MAX_GALLERY_IMAGES = 30;
const MAX_UPLOAD_FILES = 10;

const CategorySchema = z.enum([
  'exterior', 'interior', 'amenity', 'amenities', 'view', 'lobby',
  'construction', 'render', 'floor_plan', 'aerial', 'other',
]);

const GalleryImageSchema = z.object({
  url: z.string().url().max(2048),
  publicId: z.string().min(1).max(512),
  caption: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
  order: z.number().int().min(0).max(10_000),
  category: CategorySchema.optional(),
});

const ReorderSchema = z.object({ images: z.array(GalleryImageSchema).max(MAX_GALLERY_IMAGES) }).strict();
const DeleteImageSchema = z.object({ publicId: z.string().min(1).max(512) }).strict();
const UpdateCaptionSchema = z.object({
  publicId: z.string().min(1).max(512),
  caption: z.string().max(200),
  category: CategorySchema.optional(),
}).strict();

type GalleryImage = z.infer<typeof GalleryImageSchema> & { uploadedAt?: Date; public_id?: string };

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

function isProjectPublic(project: { status?: string; verificationStatus?: string; isVerified?: boolean }): boolean {
  return project.isVerified === true ||
    (String(project.status ?? '').toLowerCase() === 'verified' &&
      String(project.verificationStatus ?? '').toLowerCase() === 'verified');
}

function publicIdOf(img: Record<string, unknown>): string {
  return String(img.publicId ?? img.public_id ?? '');
}

async function parseJsonBody(req: NextApiRequest): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  return JSON.parse(text);
}

async function getProject(projectId: string) {
  return Project.findOne({ _id: projectId, isDeleted: { $ne: true } })
    .select('_id developerId gallery featureImageUrl featureImagePublicId projectName slug status verificationStatus isVerified')
    .lean() as Promise<{
      _id: mongoose.Types.ObjectId;
      developerId: mongoose.Types.ObjectId;
      gallery?: GalleryImage[];
      featureImageUrl?: string;
      featureImagePublicId?: string;
      projectName?: string;
      slug?: string;
      status?: string;
      verificationStatus?: string;
      isVerified?: boolean;
    } | null>;
}

async function requireProjectOwner(req: NextApiRequest, res: NextApiResponse, projectId: string) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  const isAdmin = ['admin', 'superadmin'].includes(auth.role);
  if (!isAdmin && auth.role !== 'developer') {
    res.status(403).json({ success: false, message: 'Access denied.' });
    return null;
  }
  const project = await getProject(projectId);
  if (!project || (!isAdmin && String(project.developerId) !== auth.id)) {
    res.status(404).json({ success: false, message: 'Project not found.' });
    return null;
  }
  return { auth, isAdmin, project };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  setSecurityHeaders(res);
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return void res.status(400).json({ success: false, message: 'Valid project ID is required.' });
  }

  const method = (req.method ?? '').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    return void res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const rl = await (method === 'GET' ? rateLimitApi(req) : rateLimitDeveloper(req));
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  await dbConnect();

  if (method === 'GET') {
    const viewer = await getOptionalAuth(req);
    const project = await getProject(id);
    if (!project) return void res.status(404).json({ success: false, message: 'Project not found.' });
    const isAdmin = !!viewer && ['admin', 'superadmin'].includes(viewer.role);
    const isOwner = !!viewer && viewer.role === 'developer' && String(project.developerId) === viewer.id;
    if (!isProjectPublic(project) && !isAdmin && !isOwner) {
      return void res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const gallery = [...(project.gallery ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((img) => ({
        url: img.url,
        publicId: publicIdOf(img as unknown as Record<string, unknown>),
        caption: img.caption,
        isPrimary: img.isPrimary,
        order: img.order,
        category: img.category,
      }));
    if (!isAdmin && !isOwner) res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return void res.status(200).json({
      success: true,
      data: {
        gallery,
        coverImage: project.featureImageUrl
          ? { url: project.featureImageUrl, publicId: project.featureImagePublicId ?? '' }
          : gallery.find((img) => img.isPrimary) ?? gallery[0] ?? null,
        totalImages: gallery.length,
      },
    });
  }

  const access = await requireProjectOwner(req, res, id);
  if (!access) return;
  const { auth, project } = access;

  try {
    if (method === 'POST') {
      const form = formidable({
        multiples: true,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024,
        maxTotalFileSize: 50 * 1024 * 1024,
        maxFiles: MAX_UPLOAD_FILES,
      });

      return void form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
        if (err) return void res.status(400).json({ success: false, message: 'Invalid upload. Images must be 5MB or smaller.' });
        const candidate = files.images || files.gallery || files.files;
        if (!candidate) return void res.status(400).json({ success: false, message: 'No images provided.' });
        const fileArray = (Array.isArray(candidate) ? candidate : [candidate]) as FormidableFile[];
        const existing = project.gallery ?? [];
        if (existing.length + fileArray.length > MAX_GALLERY_IMAGES) {
          return void res.status(422).json({ success: false, message: `Gallery limit is ${MAX_GALLERY_IMAGES} images.` });
        }

        const uploaded: GalleryImage[] = [];
        try {
          for (let i = 0; i < fileArray.length; i++) {
            const result = await uploadValidatedTempFile(fileArray[i], 'projects', 'image', {
              tags: ['project-gallery', `project:${id}`],
            });
            const captionRaw = fields[`caption_${i}`];
            const categoryRaw = fields[`category_${i}`];
            const caption = captionRaw ? String(Array.isArray(captionRaw) ? captionRaw[0] : captionRaw).slice(0, 200) : '';
            const categoryCandidate = categoryRaw ? String(Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw) : 'other';
            const categoryParsed = CategorySchema.safeParse(categoryCandidate);
            uploaded.push({
              url: result.url,
              publicId: result.publicId,
              caption,
              category: categoryParsed.success ? categoryParsed.data : 'other',
              isPrimary: existing.length === 0 && i === 0,
              order: existing.length + i,
              uploadedAt: new Date(),
            });
          }
        } catch (uploadError) {
          if (uploaded.length) await deleteFiles(uploaded.map((img) => img.publicId)).catch(() => undefined);
          if (uploadError instanceof UploadValidationError) {
            return void res.status(400).json({ success: false, message: uploadError.message });
          }
          throw uploadError;
        }

        const doc = await Project.findById(id);
        if (!doc) {
          await deleteFiles(uploaded.map((img) => img.publicId)).catch(() => undefined);
          return void res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const current = ((doc as unknown as Record<string, unknown>).gallery as GalleryImage[] | undefined) ?? [];
        (doc as unknown as Record<string, unknown>).gallery = [...current, ...uploaded];
        if (!doc.featureImageUrl && uploaded[0]) {
          doc.featureImageUrl = uploaded[0].url;
          doc.featureImagePublicId = uploaded[0].publicId;
        }
        await doc.save();

        await logSecurityEvent({ type: 'admin_action', severity: 'low', userId: auth.id, metadata: { action: 'project_gallery_images_uploaded', projectId: id, imagesCount: uploaded.length }, req });
        return void res.status(201).json({ success: true, message: `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded successfully.`, data: { uploaded, totalImages: current.length + uploaded.length } });
      });
    }

    const body = await parseJsonBody(req);

    if (method === 'PUT') {
      const parsed = ReorderSchema.safeParse(body);
      if (!parsed.success) return void res.status(422).json({ success: false, message: 'Invalid gallery data.', errors: parsed.error.flatten().fieldErrors });
      if (parsed.data.images.some((img) => !isHighrisePublicId(img.publicId))) {
        return void res.status(400).json({ success: false, message: 'Invalid gallery asset reference.' });
      }
      const existingIds = new Set((project.gallery ?? []).map((img) => publicIdOf(img as unknown as Record<string, unknown>)).filter(Boolean));
      if (parsed.data.images.some((img) => !existingIds.has(img.publicId))) {
        return void res.status(400).json({ success: false, message: 'Gallery can only be reordered using assets already attached to this project.' });
      }
      const images = parsed.data.images.map((img, index) => ({ ...img, isPrimary: false, order: index }));
      if (images.length) {
        const requested = parsed.data.images.findIndex((img) => img.isPrimary);
        images[requested >= 0 ? requested : 0].isPrimary = true;
      }
      const primary = images.find((img) => img.isPrimary);
      const doc = await Project.findById(id);
      if (!doc) return void res.status(404).json({ success: false, message: 'Project not found.' });
      (doc as unknown as Record<string, unknown>).gallery = images;
      if (primary) {
        doc.featureImageUrl = primary.url;
        doc.featureImagePublicId = primary.publicId;
      }
      await doc.save();
      return void res.status(200).json({ success: true, message: 'Gallery updated successfully.', data: { totalImages: images.length } });
    }

    if (method === 'PATCH') {
      const parsed = UpdateCaptionSchema.safeParse(body);
      if (!parsed.success) return void res.status(422).json({ success: false, message: 'Invalid data.', errors: parsed.error.flatten().fieldErrors });
      const doc = await Project.findById(id);
      if (!doc) return void res.status(404).json({ success: false, message: 'Project not found.' });
      const gallery = (((doc as unknown as Record<string, unknown>).gallery as GalleryImage[] | undefined) ?? []);
      const image = gallery.find((img) => publicIdOf(img as unknown as Record<string, unknown>) === parsed.data.publicId);
      if (!image) return void res.status(404).json({ success: false, message: 'Image not found in project gallery.' });
      image.publicId = publicIdOf(image as unknown as Record<string, unknown>);
      image.caption = parsed.data.caption;
      if (parsed.data.category) image.category = parsed.data.category;
      (doc as unknown as Record<string, unknown>).gallery = gallery;
      await doc.save();
      return void res.status(200).json({ success: true, message: 'Image updated successfully.' });
    }

    const parsed = DeleteImageSchema.safeParse(body);
    if (!parsed.success) return void res.status(422).json({ success: false, message: 'A valid publicId is required.' });
    const existing = project.gallery ?? [];
    const match = existing.find((img) => publicIdOf(img as unknown as Record<string, unknown>) === parsed.data.publicId);
    if (!match || !isHighrisePublicId(parsed.data.publicId)) {
      return void res.status(404).json({ success: false, message: 'Image not found in project gallery.' });
    }
    const remaining = existing.filter((img) => publicIdOf(img as unknown as Record<string, unknown>) !== parsed.data.publicId);
    const doc = await Project.findById(id);
    if (!doc) return void res.status(404).json({ success: false, message: 'Project not found.' });
    (doc as unknown as Record<string, unknown>).gallery = remaining;
    if (doc.featureImagePublicId === parsed.data.publicId) {
      const nextPrimary = remaining.find((img) => img.isPrimary) ?? remaining[0];
      doc.featureImageUrl = nextPrimary?.url;
      doc.featureImagePublicId = nextPrimary ? publicIdOf(nextPrimary as unknown as Record<string, unknown>) : undefined;
    }
    await doc.save();
    await deleteFiles([parsed.data.publicId]).catch(() => undefined);
    await logSecurityEvent({ type: 'admin_action', severity: 'low', userId: auth.id, metadata: { action: 'project_gallery_image_deleted', projectId: id }, req });
    return void res.status(200).json({ success: true, message: 'Image deleted successfully.' });
  } catch (error: unknown) {
    await logSecurityEvent({ type: 'system_error', severity: 'medium', userId: auth.id, metadata: { action: 'project_gallery_operation_failed', projectId: id, reason: error instanceof Error ? error.message : 'Unknown error' }, req });
    return void res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}
