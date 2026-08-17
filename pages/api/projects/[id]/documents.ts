import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import cloudinary, { deleteFile, isHighrisePublicId } from '@/lib/cloudinary';
import { uploadValidatedTempFile, UploadValidationError } from '@/lib/secureFormidableUpload';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitDeveloper, rateLimitApi, sendRateLimitResponse, setRateLimitHeaders } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

export const config = { api: { bodyParser: false } };

const MAX_DOCUMENTS = 20;
const MAX_UPLOAD_FILES = 5;
const DOCUMENT_CATEGORIES = [
  'noc', 'approval_letter', 'building_plan', 'layout_plan', 'development_agreement',
  'allotment_letter', 'rera_registration', 'environmental_clearance', 'brochure',
  'payment_plan', 'floor_plan', 'specification', 'legal', 'financial', 'other',
] as const;
const VISIBILITY_OPTIONS = ['public', 'registered', 'admin_only'] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
type DocumentVisibility = (typeof VISIBILITY_OPTIONS)[number];
type ResourceType = 'image' | 'raw';

const UpdateDocumentSchema = z.object({
  publicId: z.string().min(1).max(512),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  visibility: z.enum(VISIBILITY_OPTIONS).optional(),
  order: z.number().int().min(0).max(10_000).optional(),
}).strict();
const DeleteDocumentSchema = z.object({ publicId: z.string().min(1).max(512) }).strict();

interface ProjectDocument {
  url: string;
  publicId: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  fileType: string;
  fileSize?: number;
  resourceType?: ResourceType;
  format?: string;
  order: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
}

function isProjectPublic(project: { status?: string; verificationStatus?: string; isVerified?: boolean }): boolean {
  return project.isVerified === true ||
    (String(project.status ?? '').toLowerCase() === 'verified' &&
      String(project.verificationStatus ?? '').toLowerCase() === 'verified');
}

function fieldValue(fields: Fields, name: string): string {
  const val = fields[name];
  return val ? String(Array.isArray(val) ? val[0] ?? '' : val) : '';
}

function fileTypeFor(file: FormidableFile, uploadedFormat?: string): string {
  if (uploadedFormat) return uploadedFormat.toLowerCase();
  const mime = String(file.mimetype ?? '').toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'file';
}

function signedDocumentUrl(doc: ProjectDocument): string {
  const format = String(doc.format || doc.fileType || 'pdf').replace(/^\./, '');
  const resourceType = doc.resourceType ?? (format === 'pdf' ? 'image' : 'image');
  return cloudinary.utils.private_download_url(doc.publicId, format, {
    type: 'authenticated',
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: false,
  });
}

async function parseJsonBody(req: NextApiRequest): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text ? JSON.parse(text) : {};
}

async function getProject(id: string) {
  return Project.findOne({ _id: id, isDeleted: { $ne: true } })
    .select('_id developerId documents projectName status verificationStatus isVerified')
    .lean() as Promise<{
      _id: mongoose.Types.ObjectId;
      developerId: mongoose.Types.ObjectId;
      documents?: ProjectDocument[];
      projectName?: string;
      status?: string;
      verificationStatus?: string;
      isVerified?: boolean;
    } | null>;
}

async function requireProjectOwner(req: NextApiRequest, res: NextApiResponse, id: string) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  const isAdmin = ['admin', 'superadmin'].includes(auth.role);
  if (!isAdmin && auth.role !== 'developer') {
    res.status(403).json({ success: false, message: 'Access denied.' });
    return null;
  }
  const project = await getProject(id);
  if (!project || (!isAdmin && String(project.developerId) !== auth.id)) {
    res.status(404).json({ success: false, message: 'Project not found.' });
    return null;
  }
  return { auth, project, isAdmin };
}

async function deleteAttachedDocument(doc: ProjectDocument): Promise<void> {
  if (isHighrisePublicId(doc.publicId)) {
    const result = await deleteFile(doc.publicId, { resourceType: doc.resourceType ?? 'image' });
    if (result.success) return;
  }
  // Legacy project-document records were stored under an older Highrise folder.
  // Only delete here after exact attachment ownership has already been proven.
  if (doc.publicId.startsWith('highrise/projects/documents/')) {
    for (const resourceType of [doc.resourceType ?? 'image', 'raw'] as ResourceType[]) {
      try {
        const result = await cloudinary.uploader.destroy(doc.publicId, { resource_type: resourceType, type: 'authenticated', invalidate: true });
        if (result.result === 'ok' || result.result === 'not found') return;
      } catch { /* try next resource type */ }
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  setSecurityHeaders(res);
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return void res.status(400).json({ success: false, message: 'Valid project ID is required.' });

  const method = (req.method ?? '').toUpperCase();
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
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

    const allDocs = [...(project.documents ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const filtered = allDocs.filter((doc) => {
      if (isAdmin || isOwner) return true;
      if (doc.visibility === 'public') return true;
      return !!viewer && doc.visibility === 'registered';
    });
    const safeDocs = filtered.map((doc) => ({
      url: signedDocumentUrl(doc),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      visibility: isAdmin || isOwner ? doc.visibility : undefined,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      order: doc.order,
      uploadedAt: doc.uploadedAt,
      // publicId is intentionally not needed by public clients; owner/admin tools get it.
      publicId: isAdmin || isOwner ? doc.publicId : undefined,
      expiresInSeconds: 300,
    }));
    const byCategory: Record<string, typeof safeDocs> = {};
    for (const doc of safeDocs) (byCategory[doc.category] ??= []).push(doc);
    return void res.status(200).json({ success: true, data: { documents: safeDocs, byCategory, totalDocuments: safeDocs.length } });
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
        maxTotalFileSize: 25 * 1024 * 1024,
        maxFiles: MAX_UPLOAD_FILES,
      });
      return void form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
        if (err) return void res.status(400).json({ success: false, message: 'Invalid upload. Each document must be 5MB or smaller.' });
        const candidate = files.documents || files.files || files.document;
        if (!candidate) return void res.status(400).json({ success: false, message: 'No documents provided.' });
        const fileArray = (Array.isArray(candidate) ? candidate : [candidate]) as FormidableFile[];
        const existing = project.documents ?? [];
        if (existing.length + fileArray.length > MAX_DOCUMENTS) {
          return void res.status(422).json({ success: false, message: `Document limit is ${MAX_DOCUMENTS}.` });
        }

        const uploaded: ProjectDocument[] = [];
        try {
          for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            // Private project evidence accepts only PDF/JPEG/PNG/WebP. Office macros and
            // arbitrary archives are deliberately rejected before Cloudinary.
            const result = await uploadValidatedTempFile(file, 'projectDocuments', 'kyc', {
              tags: ['project-document', `project:${id}`],
            });
            const rawCategory = fieldValue(fields, `category_${i}`) || fieldValue(fields, 'category') || 'other';
            const category = DOCUMENT_CATEGORIES.includes(rawCategory as DocumentCategory) ? rawCategory as DocumentCategory : 'other';
            const rawVisibility = fieldValue(fields, `visibility_${i}`) || fieldValue(fields, 'visibility') || 'admin_only';
            const visibility = VISIBILITY_OPTIONS.includes(rawVisibility as DocumentVisibility) ? rawVisibility as DocumentVisibility : 'admin_only';
            const baseTitle = file.originalFilename?.replace(/\.[^/.]+$/, '') || `Document ${existing.length + i + 1}`;
            uploaded.push({
              url: result.url,
              publicId: result.publicId,
              title: (fieldValue(fields, `title_${i}`) || fieldValue(fields, 'title') || baseTitle).slice(0, 200),
              description: (fieldValue(fields, `description_${i}`) || fieldValue(fields, 'description')).slice(0, 500),
              category,
              visibility,
              fileType: fileTypeFor(file, result.format),
              fileSize: result.size ?? file.size,
              resourceType: result.resourceType === 'raw' ? 'raw' : 'image',
              format: result.format,
              order: existing.length + i,
              uploadedAt: new Date(),
              uploadedBy: auth.id,
            });
          }
        } catch (uploadError) {
          await Promise.all(uploaded.map((doc) => deleteAttachedDocument(doc))).catch(() => undefined);
          if (uploadError instanceof UploadValidationError) return void res.status(400).json({ success: false, message: uploadError.message });
          throw uploadError;
        }

        const doc = await Project.findById(id);
        if (!doc) {
          await Promise.all(uploaded.map((item) => deleteAttachedDocument(item))).catch(() => undefined);
          return void res.status(404).json({ success: false, message: 'Project not found.' });
        }
        const current = (((doc as unknown as Record<string, unknown>).documents as ProjectDocument[] | undefined) ?? []);
        (doc as unknown as Record<string, unknown>).documents = [...current, ...uploaded];
        await doc.save();
        await logSecurityEvent({ type: 'admin_action', severity: 'medium', userId: auth.id, metadata: { action: 'project_documents_uploaded', projectId: id, docsCount: uploaded.length, categories: uploaded.map((d) => d.category) }, req });
        return void res.status(201).json({ success: true, message: `${uploaded.length} document${uploaded.length === 1 ? '' : 's'} uploaded successfully.`, data: { totalDocuments: current.length + uploaded.length } });
      });
    }

    const body = await parseJsonBody(req);
    if (method === 'PATCH') {
      const parsed = UpdateDocumentSchema.safeParse(body);
      if (!parsed.success) return void res.status(422).json({ success: false, message: 'Invalid data.', errors: parsed.error.flatten().fieldErrors });
      const doc = await Project.findById(id);
      if (!doc) return void res.status(404).json({ success: false, message: 'Project not found.' });
      const documents = (((doc as unknown as Record<string, unknown>).documents as ProjectDocument[] | undefined) ?? []);
      const item = documents.find((entry) => entry.publicId === parsed.data.publicId);
      if (!item) return void res.status(404).json({ success: false, message: 'Document not found in this project.' });
      for (const key of ['title', 'description', 'category', 'visibility', 'order'] as const) {
        if (parsed.data[key] !== undefined) (item as unknown as Record<string, unknown>)[key] = parsed.data[key];
      }
      (doc as unknown as Record<string, unknown>).documents = documents;
      await doc.save();
      await logSecurityEvent({ type: 'admin_action', severity: 'low', userId: auth.id, metadata: { action: 'project_document_updated', projectId: id }, req });
      return void res.status(200).json({ success: true, message: 'Document updated successfully.' });
    }

    const parsed = DeleteDocumentSchema.safeParse(body);
    if (!parsed.success) return void res.status(422).json({ success: false, message: 'A valid publicId is required.' });
    const attached = (project.documents ?? []).find((item) => item.publicId === parsed.data.publicId);
    if (!attached) return void res.status(404).json({ success: false, message: 'Document not found in this project.' });
    const doc = await Project.findById(id);
    if (!doc) return void res.status(404).json({ success: false, message: 'Project not found.' });
    const remaining = ((((doc as unknown as Record<string, unknown>).documents as ProjectDocument[] | undefined) ?? [])).filter((item) => item.publicId !== parsed.data.publicId);
    (doc as unknown as Record<string, unknown>).documents = remaining;
    await doc.save();
    await deleteAttachedDocument(attached).catch(() => undefined);
    await logSecurityEvent({ type: 'admin_action', severity: 'medium', userId: auth.id, metadata: { action: 'project_document_deleted', projectId: id }, req });
    return void res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error: unknown) {
    await logSecurityEvent({ type: 'system_error', severity: 'medium', userId: auth.id, metadata: { action: 'project_document_operation_failed', projectId: id, reason: error instanceof Error ? error.message : 'Unknown error' }, req });
    return void res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}
