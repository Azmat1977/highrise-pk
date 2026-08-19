// pages/api/admin/email-templates/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import EmailTemplate from '@/models/EmailTemplate';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid template ID' });
  }

  await dbConnect();

  // GET - Get single template
  if (req.method === 'GET') {
    try {
      const template = await EmailTemplate.findById(id).lean();

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      return res.status(200).json({ success: true, template });

    } catch (error: unknown) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // PUT - Update template
  if (req.method === 'PUT') {
    try {
      const { name, subject, message, category, isActive } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = String(name).trim().slice(0, 120);
      if (subject) updateData.subject = String(subject).trim().slice(0, 200);
      if (message) updateData.message = String(message).trim().slice(0, 20000);
      if (category) updateData.category = String(category).trim().slice(0, 40);
      if (typeof isActive === 'boolean') updateData.isActive = isActive;

      const template = await EmailTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        template,
      });

    } catch (error: unknown) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // DELETE - Delete template
  if (req.method === 'DELETE') {
    try {
      const template = await EmailTemplate.findByIdAndDelete(id);

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Template deleted successfully',
      });

    } catch (error: unknown) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
