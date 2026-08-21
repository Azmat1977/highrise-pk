import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Media from '@/models/Media';
import cloudinary from '@/lib/cloudinary';
import mongoose from 'mongoose';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

type MediaResponse = {
  success: boolean;
  message: string;
  media?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MediaResponse>
) {
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid media ID' });
  }

  await dbConnect();

  // GET - Get single media
  if (req.method === 'GET') {
    try {
      const media = await Media.findById(id).populate('uploadedBy', 'name email');

      if (!media) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }

      return res.status(200).json({ success: true, message: 'Media found', media });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Error fetching media',
      });
    }
  }

  // PUT - Update media (alt, caption)
  if (req.method === 'PUT') {
    try {
      const { alt, caption } = req.body;

      const media = await Media.findByIdAndUpdate(
        id,
        {
          alt: typeof alt === 'string' ? alt.trim().slice(0, 200) : alt,
          caption: typeof caption === 'string' ? caption.trim().slice(0, 500) : caption,
        },
        { new: true, runValidators: true }
      );

      if (!media) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Media updated successfully',
        media,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Error updating media',
      });
    }
  }

  // DELETE - Soft delete or permanent delete
  if (req.method === 'DELETE') {
    try {
      const { permanent = 'false' } = req.query;

      const media = await Media.findById(id);

      if (!media) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }

      if (permanent === 'true') {
        // Permanent delete - also delete from Cloudinary
        try {
          await cloudinary.uploader.destroy(media.publicId, {
            resource_type: media.resourceType,
          });
        } catch {
          // Continue even if Cloudinary delete fails
        }

        await Media.findByIdAndDelete(id);

        return res.status(200).json({
          success: true,
          message: 'Media permanently deleted',
        });
      } else {
        // Soft delete
        media.isDeleted = true;
        media.deletedAt = new Date();
        await media.save();

        return res.status(200).json({
          success: true,
          message: 'Media moved to trash',
          media,
        });
      }
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Error deleting media',
      });
    }
  }

  // PATCH - Restore from trash
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body;

      if (action === 'restore') {
        const media = await Media.findByIdAndUpdate(
          id,
          { isDeleted: false, deletedAt: null },
          { new: true }
        );

        if (!media) {
          return res.status(404).json({ success: false, message: 'Media not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Media restored successfully',
          media,
        });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Error restoring media',
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
