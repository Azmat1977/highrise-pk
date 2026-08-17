//C:\dev\highrise-pk\pages\api\properties\[id]\contact.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import { isPublicProperty } from '@/lib/property/publicProperty';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) { res.status(429).json({ success: false, message: 'Too many contact requests.' }); return; }
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const id = String(req.query.id ?? '');
  if (!mongoose.isValidObjectId(id)) { res.status(400).json({ success: false, message: 'Invalid Property.' }); return; }
  await dbConnect();
  const property = await Property.findById(id).select('verification isDeleted isFlagged contactDetails whatsappNumber contactTime').lean<Record<string, any>>();
  if (!property || !isPublicProperty(property)) { res.status(404).json({ success: false, message: 'Property not found.' }); return; }
  const cd = property.contactDetails ?? {};
  res.status(200).json({
    success: true,
    contact: {
      name: cd.personName ?? null,
      phone: cd.showPhoneOnListing === false ? null : (cd.primaryPhone ?? null),
      whatsapp: cd.allowWhatsappMessages === false ? null : (cd.whatsappNumber ?? property.whatsappNumber ?? null),
      email: cd.showEmailOnListing === true ? (cd.email ?? null) : null,
      preferredMethod: cd.preferredMethod ?? null,
      contactTime: cd.contactTime ?? property.contactTime ?? null,
    },
  });
}
