// pages/api/admin/email-templates/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import EmailTemplate from '@/models/EmailTemplate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // GET - List templates
  if (req.method === 'GET') {
    try {
      const { category, active } = req.query;

      const query: any = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      if (active === 'true') {
        query.isActive = true;
      }

      const templates = await EmailTemplate.find(query)
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        templates,
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  // POST - Create template
  if (req.method === 'POST') {
    try {
      const { name, subject, message, category } = req.body;

      if (!name || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name, subject, and message are required',
        });
      }

      const template = await EmailTemplate.create({
        name,
        subject,
        message,
        category: category || 'other',
        createdBy: 'Admin',
      });

      return res.status(201).json({
        success: true,
        message: 'Template created successfully',
        template,
      });

    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Template with this name already exists',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
