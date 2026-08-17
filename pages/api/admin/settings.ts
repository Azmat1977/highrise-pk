// pages/api/admin/settings.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';

type ApiResponse = { success: boolean; message?: string; data?: unknown; error?: string };

const ALLOWED_FIELDS = new Set([
  'siteName','siteTagline','siteUrl','siteLogo','siteFavicon',
  'contactEmail','contactPhone','contactWhatsApp','contactAddress',
  'socialFacebook','socialInstagram','socialTwitter','socialLinkedIn','socialYouTube','socialTikTok',
  'seoTitle','seoDescription','seoKeywords','googleAnalyticsId','googleTagManagerId',
  'emailHost','emailPort','emailFrom','emailFromName',
  'currency','currencySymbol','timezone','dateFormat','timeFormat',
  'maintenanceMode','allowRegistration','enableNotifications','enableNewsletter','enableComments','requireEmailVerification',
  'businessHours','watermark',
]);

function pickAllowed(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (ALLOWED_FIELDS.has(key) && val !== undefined) clean[key] = val;
  }
  return clean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) { sendRateLimitResponse(res, rl); return; }

  await dbConnect();

  try {
    if (req.method === 'GET') {
      let settings = await Settings.findOne();
      if (!settings) settings = await Settings.create({ updatedBy: auth.id });
      return res.status(200).json({ success: true, data: settings });
    }

    if (req.method === 'PUT') {
      const updates = pickAllowed(req.body);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid settings supplied' });
      }
      let settings = await Settings.findOne();
      if (!settings) settings = await Settings.create({ ...updates, updatedBy: auth.id });
      else {
        for (const [key, value] of Object.entries(updates)) (settings as unknown as Record<string, unknown>)[key] = value;
        settings.updatedBy = auth.id;
        await settings.save();
      }
      return res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
    }

    if (req.method === 'PATCH') {
      const { section, data } = req.body ?? {};
      if (typeof section !== 'string' || !section.trim()) return res.status(400).json({ success: false, error: 'Section is required' });
      const updates = pickAllowed(data);
      if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, error: 'No valid settings supplied' });
      let settings = await Settings.findOne();
      if (!settings) settings = await Settings.create({ updatedBy: auth.id });
      for (const [key, value] of Object.entries(updates)) (settings as unknown as Record<string, unknown>)[key] = value;
      settings.updatedBy = auth.id;
      await settings.save();
      return res.status(200).json({ success: true, message: `${section} settings updated successfully`, data: settings });
    }

    if (req.method === 'POST') {
      const action = typeof req.body?.action === 'string' ? req.body.action : '';
      if (action === 'reset') {
        await Settings.deleteMany({});
        const settings = await Settings.create({ updatedBy: auth.id });
        return res.status(200).json({ success: true, message: 'Settings reset to defaults', data: settings });
      }
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    res.setHeader('Allow', ['GET','PUT','PATCH','POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: unknown) {
    console.error('[ADMIN_SETTINGS] Operation failed', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ success: false, error: 'Settings operation failed' });
  }
}
