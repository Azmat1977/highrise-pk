// pages/api/admin/email-templates/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import EmailTemplate from '@/models/EmailTemplate';
import { requireAdmin } from '@/lib/requireAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const { id } = req.query;

  await dbConnect();

  // GET - Get single template
  if (req.method === 'GET') {
    try {
      const template = await EmailTemplate.findById(id).lean();

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      return res.status(200).json({ success: true, template });

    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // PUT - Update template
  if (req.method === 'PUT') {
    try {
      const { name, subject, message, category, isActive } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (subject) updateData.subject = subject;
      if (message) updateData.message = message;
      if (category) updateData.category = category;
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

    } catch (error: any) {
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

    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
