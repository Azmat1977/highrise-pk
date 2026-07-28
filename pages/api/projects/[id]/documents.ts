// pages/api/projects/[id]/documents.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import cloudinary from '@/lib/cloudinary';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
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

const MAX_DOCUMENTS         = 20;
const MAX_FILE_SIZE_MB      = 25;
const CLOUDINARY_FOLDER     = 'highrise/projects/documents';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const DOCUMENT_CATEGORIES = [
  'noc',
  'approval_letter',
  'building_plan',
  'layout_plan',
  'development_agreement',
  'allotment_letter',
  'rera_registration',
  'environmental_clearance',
  'brochure',
  'payment_plan',
  'floor_plan',
  'specification',
  'legal',
  'financial',
  'other',
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

const VISIBILITY_OPTIONS = ['public', 'registered', 'admin_only'] as const;
type DocumentVisibility = (typeof VISIBILITY_OPTIONS)[number];

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const UpdateDocumentSchema = z.object({
  publicId:    z.string().min(1).max(512),
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  category:    z.enum(DOCUMENT_CATEGORIES).optional(),
  visibility:  z.enum(VISIBILITY_OPTIONS).optional(),
  order:       z.number().min(0).max(10000).optional(),
});

const DeleteDocumentSchema = z.object({
  publicId: z.string().min(1).max(512),
});

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface ProjectDocument {
  url:          string;
  publicId:     string;
  title:        string;
  description?: string;
  category:     DocumentCategory;
  visibility:   DocumentVisibility;
  fileType:     string;
  fileSize?:    number;
  order:        number;
  uploadedAt:   Date;
  uploadedBy?:  string;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

async function uploadDocToCloudinary(
  file: FormidableFile
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(file.filepath, {
    folder:        CLOUDINARY_FOLDER,
    resource_type: 'auto',
    access_mode:   'authenticated',
  });
  return {
    url:      result.secure_url,
    publicId: result.public_id,
  };
}

async function deleteDocFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      invalidate:    true,
    });
    return true;
  } catch {
    // Try image resource type (PDFs sometimes stored as images)
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate:    true,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
}

function getFileType(mimetype: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg':      'jpeg',
    'image/png':       'png',
    'image/webp':      'webp',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return mimeMap[mimetype] ?? 'unknown';
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
    .select('_id developerId documents')
    .lean() as Record<string, unknown> | null;

  if (!project) {
    return {
      ok:     false,
      project: null,
      error:  'Project not found or you do not have permission',
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
  // GET — List project documents (visibility-gated)
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    // Auth is optional for GET — determines visibility
    let userId:   string | null = null;
    let userRole: string | null = null;

    try {
      const auth = await requireAuth(req, res);
      if (auth) {
        userId   = auth.id;
        userRole = auth.role as string;
      }
    } catch {
      // Not authenticated — public access only
    }

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
        .select('documents projectName developerId')
        .lean() as {
          _id:          mongoose.Types.ObjectId;
          documents?:   ProjectDocument[];
          projectName?: string;
          developerId?: mongoose.Types.ObjectId;
        } | null;

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Apply visibility filtering
      const allDocs = (project.documents ?? [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      let filteredDocs: ProjectDocument[];

      if (userRole === 'admin') {
        // Admin sees everything
        filteredDocs = allDocs;
      } else if (userId) {
        // Logged-in user sees public + registered
        // Developer sees their own admin_only docs too
        const isOwner = project.developerId?.toString() === userId;
        filteredDocs = allDocs.filter((doc) => {
          if (doc.visibility === 'public') return true;
          if (doc.visibility === 'registered') return true;
          if (doc.visibility === 'admin_only' && isOwner) return true;
          return false;
        });
      } else {
        // Public — only public documents
        filteredDocs = allDocs.filter((doc) => doc.visibility === 'public');
      }

      // Strip internal fields for non-admin
      const safeDocs = filteredDocs.map((doc) => ({
        url:         doc.url,
        publicId:    doc.publicId,
        title:       doc.title,
        description: doc.description,
        category:    doc.category,
        visibility:  userRole === 'admin' ? doc.visibility : undefined,
        fileType:    doc.fileType,
        fileSize:    doc.fileSize,
        order:       doc.order,
        uploadedAt:  doc.uploadedAt,
      }));

      // Group by category for frontend convenience
      const byCategory: Record<string, typeof safeDocs> = {};
      for (const doc of safeDocs) {
        const cat = doc.category ?? 'other';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(doc);
      }

      res.setHeader('Cache-Control', 'private, max-age=30');

      return res.status(200).json({
        success: true,
        data: {
          documents:   safeDocs,
          byCategory,
          totalDocuments: safeDocs.length,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        metadata: {
          action:    'project_documents_fetch_failed',
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
  // POST — Upload new document(s)
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    const form = formidable({
      multiples:      true,
      keepExtensions: true,
      maxFileSize:    MAX_FILE_SIZE_MB * 1024 * 1024,
      maxFiles:       5,
    });

    return form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Error parsing upload. Maximum file size is 25MB.',
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

        const existingDocs = ((ownership.project as any)?.documents ?? []) as ProjectDocument[];

        // Get uploaded files
        const docFiles = files.documents || files.files || files.document;
        if (!docFiles) {
          return res.status(400).json({
            success: false,
            message: 'No documents provided',
          });
        }

        const fileArray = Array.isArray(docFiles) ? docFiles : [docFiles];

        // Check document limit
        if (existingDocs.length + fileArray.length > MAX_DOCUMENTS) {
          return res.status(400).json({
            success: false,
            message: `Document limit is ${MAX_DOCUMENTS}. Currently ${existingDocs.length}, trying to add ${fileArray.length}.`,
          });
        }

        // Validate mime types
        for (const file of fileArray) {
          const f = file as FormidableFile;
          if (f.mimetype && !ALLOWED_MIME_TYPES.includes(f.mimetype)) {
            return res.status(400).json({
              success: false,
              message: `Invalid file type: ${f.mimetype}. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX, XLS, XLSX.`,
            });
          }
        }

        // Parse form field helpers
        const getField = (name: string): string => {
          const val = fields[name];
          if (!val) return '';
          return Array.isArray(val) ? String(val[0] ?? '') : String(val);
        };

        // Upload to Cloudinary
        const uploadedDocs: ProjectDocument[] = [];

        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i] as FormidableFile;
          const uploaded = await uploadDocToCloudinary(file);

          // Parse per-file metadata from form fields
          const title = getField(`title_${i}`) ||
                        getField('title') ||
                        file.originalFilename?.replace(/\.[^/.]+$/, '') ||
                        `Document ${existingDocs.length + i + 1}`;

          const description = getField(`description_${i}`) || getField('description') || '';

          const rawCategory = getField(`category_${i}`) || getField('category') || 'other';
          const category = DOCUMENT_CATEGORIES.includes(rawCategory as DocumentCategory)
            ? (rawCategory as DocumentCategory)
            : 'other';

          const rawVisibility = getField(`visibility_${i}`) || getField('visibility') || 'public';
          const visibility = VISIBILITY_OPTIONS.includes(rawVisibility as DocumentVisibility)
            ? (rawVisibility as DocumentVisibility)
            : 'public';

          uploadedDocs.push({
            url:         uploaded.url,
            publicId:    uploaded.publicId,
            title:       title.slice(0, 200),
            description: description.slice(0, 500),
            category,
            visibility,
            fileType:    getFileType(file.mimetype ?? ''),
            fileSize:    file.size ?? undefined,
            order:       existingDocs.length + i,
            uploadedAt:  new Date(),
            uploadedBy:  auth.email,
          });
        }

        // Update project documents
        const Project = mongoose.models.Project as
          mongoose.Model<mongoose.Document>;

        await Project.findByIdAndUpdate(id, {
          $push: {
            documents: { $each: uploadedDocs },
          },
        });

        // Audit log
        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   auth.id,
          metadata: {
            action:     'project_documents_uploaded',
            projectId:  id,
            docsCount:  uploadedDocs.length,
            categories: uploadedDocs.map((d) => d.category),
            totalAfter: existingDocs.length + uploadedDocs.length,
          },
        });

        return res.status(201).json({
          success: true,
          message: `${uploadedDocs.length} document${uploadedDocs.length !== 1 ? 's' : ''} uploaded successfully`,
          data: {
            uploaded:       uploadedDocs,
            totalDocuments: existingDocs.length + uploadedDocs.length,
          },
        });

      } catch (error: unknown) {
        await logSecurityEvent({
          type:     'system_error',
          severity: 'high',
          userId:   auth.id,
          metadata: {
            action:    'project_documents_upload_failed',
            projectId: id,
            reason:    error instanceof Error ? error.message : 'Unknown error',
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
  // PATCH — Update document metadata
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      // Parse body manually (bodyParser disabled)
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const parsed = UpdateDocumentSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { publicId, title, description, category, visibility, order } = parsed.data;

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Build positional update
      const updateFields: Record<string, unknown> = {};
      if (title !== undefined)       updateFields['documents.$.title']       = title;
      if (description !== undefined) updateFields['documents.$.description'] = description;
      if (category !== undefined)    updateFields['documents.$.category']    = category;
      if (visibility !== undefined)  updateFields['documents.$.visibility']  = visibility;
      if (order !== undefined)       updateFields['documents.$.order']       = order;

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields provided to update',
        });
      }

      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      const result = await Project.findOneAndUpdate(
        {
          _id:                   new mongoose.Types.ObjectId(id),
          'documents.publicId':  publicId,
        },
        { $set: updateFields },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Document not found in this project',
        });
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:        'project_document_updated',
          projectId:     id,
          publicId,
          changedFields: Object.keys(updateFields),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Document updated successfully',
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_document_update_failed',
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
  // DELETE — Remove document
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      // Parse body manually
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

      const parsed = DeleteDocumentSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'publicId is required to delete a document',
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

      // Remove from documents array
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      const result = await Project.findByIdAndUpdate(
        id,
        { $pull: { documents: { publicId } } },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Document not found in this project',
        });
      }

      // Delete from Cloudinary (fire and forget)
      deleteDocFromCloudinary(publicId).catch(() => {
        // Silent — DB is source of truth
      });

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_document_deleted',
          projectId: id,
          publicId,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_document_delete_failed',
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