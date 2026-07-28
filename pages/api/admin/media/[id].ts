import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Media from '@/models/Media';
import cloudinary from '@/lib/cloudinary';
import mongoose from 'mongoose';

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
  const { id } = req.query;

  // Validate ID
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching media',
        error: error.message,
      });
    }
  }

  // PUT - Update media (alt, caption)
  if (req.method === 'PUT') {
    try {
      const { alt, caption } = req.body;

      const media = await Media.findByIdAndUpdate(
        id,
        { alt, caption },
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error updating media',
        error: error.message,
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
        } catch (cloudinaryError) {
          console.error('Cloudinary delete error:', cloudinaryError);
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting media',
        error: error.message,
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error restoring media',
        error: error.message,
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}