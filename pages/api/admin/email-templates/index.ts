// pages/api/admin/email-templates/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
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

    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Server error',
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
        name: String(name).trim().slice(0, 120),
        subject: String(subject).trim().slice(0, 200),
        message: String(message).trim().slice(0, 20000),
        category: category || 'other',
        createdBy: auth.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Template created successfully',
        template,
      });

    } catch (error: unknown) {
      const duplicate =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000;

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Template with this name already exists',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
