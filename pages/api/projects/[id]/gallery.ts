// pages/api/projects/[id]/gallery.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import cloudinary from '@/lib/cloudinary';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  rateLimitApi,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════

export const config = {
  api: { bodyParser: false },
};

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════

const MAX_GALLERY_IMAGES  = 30;
const MAX_FILE_SIZE_MB    = 10;
const ALLOWED_MIME_TYPES  = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
const CLOUDINARY_FOLDER   = 'highrise/projects/gallery';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const ReorderSchema = z.object({
  images: z.array(z.object({
    url:       z.string().min(1).max(2048),
    publicId:  z.string().min(1).max(512),
    caption:   z.string().max(200).optional(),
    isPrimary: z.boolean().optional(),
    order:     z.number().min(0).max(10000),
    category:  z.enum([
      'exterior', 'interior', 'amenities',
      'floor_plan', 'construction', 'aerial', 'other',
    ]).optional(),
  })).min(1).max(MAX_GALLERY_IMAGES),
});

const DeleteImageSchema = z.object({
  publicId: z.string().min(1).max(512),
});

const UpdateCaptionSchema = z.object({
  publicId: z.string().min(1).max(512),
  caption:  z.string().max(200),
  category: z.enum([
    'exterior', 'interior', 'amenities',
    'floor_plan', 'construction', 'aerial', 'other',
  ]).optional(),
});

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface GalleryImage {
  url:       string;
  publicId:  string;
  caption?:  string;
  isPrimary?: boolean;
  order?:    number;
  category?: string;
  uploadedAt?: Date;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

async function uploadToCloudinary(
  file: FormidableFile
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(file.filepath, {
    folder:        CLOUDINARY_FOLDER,
    resource_type: 'image',
    quality:       'auto:good',
    fetch_format:  'auto',
    transformation: [
      { width: 1920, height: 1080, crop: 'limit' },
    ],
  });
  return {
    url:      result.secure_url,
    publicId: result.public_id,
  };
}

async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}

async function verifyProjectOwnership(
  projectId: string,
  authId:    string,
  role:      string
): Promise<{
  ok:      boolean;
  project: Record<string, unknown> | null;
  error?:  string;
  status?: number;
}> {
  const Project = mongoose.models.Project as
    mongoose.Model<mongoose.Document>;

  if (!Project) {
    return { ok: false, project: null, error: 'Something went wrong', status: 500 };
  }

  const projectQuery: Record<string, unknown> = {
    _id:       new mongoose.Types.ObjectId(projectId),
    isDeleted: { $ne: true },
  };

  if (role === 'developer') {
    const DeveloperProfile = mongoose.models.DeveloperProfile as
      mongoose.Model<mongoose.Document>;

    const devProfile = await DeveloperProfile.findOne(
      { user: authId },
      { _id: 1 }
    ).lean() as { _id: mongoose.Types.ObjectId } | null;

    if (!devProfile) {
      return { ok: false, project: null, error: 'Developer profile not found', status: 403 };
    }

    projectQuery.developerId = devProfile._id;
  }

  const project = await Project.findOne(projectQuery)
    .select('_id developerId gallery coverImage')
    .lean() as Record<string, unknown> | null;

  if (!project) {
    return {
      ok: false,
      project: null,
      error: 'Project not found or you do not have permission',
      status: 404,
    };
  }

  return { ok: true, project };
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── ID guard ──
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // ════════════════════════════════════════════════════
  // GET — Public gallery (no auth required)
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    await dbConnect();

    try {
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      if (!Project) {
        return res.status(500).json({ success: false, message: 'Something went wrong' });
      }

      const project = await Project.findOne({
        _id:       new mongoose.Types.ObjectId(id),
        isDeleted: { $ne: true },
      })
        .select('gallery coverImage projectName slug')
        .lean() as {
          gallery?:    GalleryImage[];
          coverImage?: { url: string; publicId: string };
          projectName?: string;
          slug?:       string;
        } | null;

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Sort by order, filter out sensitive fields
      const gallery = (project.gallery ?? [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((img) => ({
          url:       img.url,
          publicId:  img.publicId,
          caption:   img.caption,
          isPrimary: img.isPrimary,
          order:     img.order,
          category:  img.category,
        }));

      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

      return res.status(200).json({
        success: true,
        data: {
          gallery,
          coverImage: project.coverImage ?? null,
          totalImages: gallery.length,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        metadata: {
          action:    'project_gallery_fetch_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // AUTH + RATE LIMIT for all mutation methods
  // ═══════════════════════════════════════════════════
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  await dbConnect();

  // ════════════════════════════════════════════════════
  // POST — Upload new images to gallery
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    const form = formidable({
      multiples:      true,
      keepExtensions: true,
      maxFileSize:    MAX_FILE_SIZE_MB * 1024 * 1024,
      maxFiles:       10,
    });

    return form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Error parsing upload. Maximum file size is 10MB.',
        });
      }

      try {
        // Verify ownership
        const ownership = await verifyProjectOwnership(id, auth.id, role);
        if (!ownership.ok) {
          return res.status(ownership.status ?? 403).json({
            success: false,
            message: ownership.error ?? 'Access denied',
          });
        }

        const existingGallery = (ownership.project as any)?.gallery ?? [];

        // Check gallery limit
        const imageFiles = files.images || files.gallery || files.files;
        if (!imageFiles) {
          return res.status(400).json({
            success: false,
            message: 'No images provided',
          });
        }

        const fileArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];

        if (existingGallery.length + fileArray.length > MAX_GALLERY_IMAGES) {
          return res.status(400).json({
            success: false,
            message: `Gallery limit is ${MAX_GALLERY_IMAGES} images. Currently ${existingGallery.length}, trying to add ${fileArray.length}.`,
          });
        }

        // Validate mime types
        for (const file of fileArray) {
          const f = file as FormidableFile;
          if (f.mimetype && !ALLOWED_MIME_TYPES.includes(f.mimetype)) {
            return res.status(400).json({
              success: false,
              message: `Invalid file type: ${f.mimetype}. Allowed: JPEG, PNG, WebP, AVIF.`,
            });
          }
        }

        // Upload all files to Cloudinary
        const uploadedImages: GalleryImage[] = [];

        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i] as FormidableFile;
          const uploaded = await uploadToCloudinary(file);
          uploadedImages.push({
            url:        uploaded.url,
            publicId:   uploaded.publicId,
            caption:    '',
            isPrimary:  existingGallery.length === 0 && i === 0,
            order:      existingGallery.length + i,
            category:   'other',
            uploadedAt: new Date(),
          });
        }

        // Parse optional captions from form fields
        for (let i = 0; i < uploadedImages.length; i++) {
          const captionKey = `caption_${i}`;
          const categoryKey = `category_${i}`;
          const captionVal = fields[captionKey];
          const categoryVal = fields[categoryKey];

          if (captionVal) {
            const caption = Array.isArray(captionVal) ? String(captionVal[0]) : String(captionVal);
            uploadedImages[i].caption = caption.slice(0, 200);
          }
          if (categoryVal) {
            const cat = Array.isArray(categoryVal) ? String(categoryVal[0]) : String(categoryVal);
            const validCategories = ['exterior', 'interior', 'amenities', 'floor_plan', 'construction', 'aerial', 'other'];
            if (validCategories.includes(cat)) {
              uploadedImages[i].category = cat;
            }
          }
        }

        // Update project gallery
        const Project = mongoose.models.Project as
          mongoose.Model<mongoose.Document>;

        await Project.findByIdAndUpdate(id, {
          $push: {
            gallery: { $each: uploadedImages },
          },
        });

        // Audit log
        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   auth.id,
          metadata: {
            action:      'project_gallery_images_uploaded',
            projectId:   id,
            imagesCount: uploadedImages.length,
            totalAfter:  existingGallery.length + uploadedImages.length,
          },
        });

        return res.status(201).json({
          success: true,
          message: `${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''} uploaded successfully`,
          data: {
            uploaded:    uploadedImages,
            totalImages: existingGallery.length + uploadedImages.length,
          },
        });

      } catch (error: unknown) {
        await logSecurityEvent({
          type:     'system_error',
          severity: 'high',
          userId:   auth.id,
          metadata: {
            action: 'project_gallery_upload_failed',
            projectId: id,
            reason: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        return res.status(500).json({
          success: false,
          message: 'Something went wrong. Please try again.',
        });
      }
    });
  }

  // ════════════════════════════════════════════════════
  // PUT — Reorder / update gallery (full replace)
  // ════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      // Parse body manually (bodyParser disabled)
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const parsed = ReorderSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gallery data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Ensure single primary image
      const images = parsed.data.images;
      let hasPrimary = false;
      for (const img of images) {
        if (img.isPrimary) {
          if (hasPrimary) img.isPrimary = false;
          else hasPrimary = true;
        }
      }
      if (!hasPrimary && images.length > 0) {
        images[0].isPrimary = true;
      }

      // Full replace gallery
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      await Project.findByIdAndUpdate(id, {
        $set: { gallery: images },
      });

      // Update cover image to primary
      const primary = images.find((img) => img.isPrimary);
      if (primary) {
        await Project.findByIdAndUpdate(id, {
          $set: {
            coverImage: {
              url:      primary.url,
              publicId: primary.publicId,
            },
          },
        });
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:      'project_gallery_reordered',
          projectId:   id,
          imagesCount: images.length,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Gallery updated successfully',
        data: {
          totalImages: images.length,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_gallery_reorder_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // PATCH — Update single image caption/category
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      // Parse body manually
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const parsed = UpdateCaptionSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { publicId, caption, category } = parsed.data;

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Update specific image in gallery array
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      const updateFields: Record<string, unknown> = {
        'gallery.$.caption': caption,
      };
      if (category) {
        updateFields['gallery.$.category'] = category;
      }

      const result = await Project.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          'gallery.publicId': publicId,
        },
        { $set: updateFields },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Image not found in project gallery',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Image updated successfully',
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_gallery_caption_update_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // DELETE — Remove image from gallery
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      // Parse body manually
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const parsed = DeleteImageSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'publicId is required to delete an image',
        });
      }

      const { publicId } = parsed.data;

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Remove from gallery array
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      const result = await Project.findByIdAndUpdate(
        id,
        { $pull: { gallery: { publicId } } },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Image not found in project gallery',
        });
      }

      // Delete from Cloudinary (fire and forget)
      deleteFromCloudinary(publicId).catch(() => {
        // Silent — DB is source of truth
      });

      // If deleted image was cover, set new cover
      const updatedProject = result.toObject() as { gallery?: GalleryImage[]; coverImage?: { publicId: string } };
      if (updatedProject.coverImage?.publicId === publicId) {
        const newCover = updatedProject.gallery?.[0];
        if (newCover) {
          await Project.findByIdAndUpdate(id, {
            $set: {
              coverImage: { url: newCover.url, publicId: newCover.publicId },
            },
          });
        } else {
          await Project.findByIdAndUpdate(id, {
            $unset: { coverImage: '' },
          });
        }
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:    'project_gallery_image_deleted',
          projectId: id,
          publicId,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_gallery_delete_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}