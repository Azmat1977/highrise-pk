//C:\dev\highrise-pk\pages\api\properties\[id]\contact.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import User from '@/models/User';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApiWrite } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  try {
    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.status(429).json({ success: false, message: 'Too many contact requests.' });
      return;
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;

    const id = String(req.query.id ?? '').trim();
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid Property ID.' });
      return;
    }

    await dbConnect();

    const isObjectId = mongoose.isValidObjectId(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    const property = await Property.findOne(query)
      .select('owner verification status isDeleted isFlagged contactDetails whatsappNumber contactTime phone')
      .lean<Record<string, any>>();

    if (!property || property.isDeleted) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    if (property.isFlagged) {
      res.status(403).json({ success: false, message: 'This listing is under review due to reports.' });
      return;
    }

    // Safely query owner details from User model for fallback contact numbers
    let ownerObj: Record<string, any> = {};
    if (property.owner && mongoose.isValidObjectId(String(property.owner))) {
      try {
        const u = await User.findById(property.owner)
          .select('name displayName email phone mobile')
          .lean<Record<string, any>>();
        if (u) ownerObj = u;
      } catch {
        // Non-critical fallback — continue if user record lookup fails
      }
    }

    const cd = property.contactDetails ?? {};

    const resolvedPhone = cd.showPhoneOnListing === false
      ? null
      : (cd.primaryPhone || property.phone || ownerObj.phone || ownerObj.mobile || null);

    const resolvedWhatsapp = cd.allowWhatsappMessages === false
      ? null
      : (cd.whatsappNumber || property.whatsappNumber || resolvedPhone || ownerObj.phone || null);

    const resolvedEmail = cd.showEmailOnListing === true
      ? (cd.email || ownerObj.email || null)
      : null;

    res.status(200).json({
      success: true,
      contact: {
        name: cd.personName || ownerObj.displayName || ownerObj.name || 'Property Seller',
        phone: resolvedPhone,
        whatsapp: resolvedWhatsapp,
        email: resolvedEmail,
        preferredMethod: cd.preferredMethod ?? 'phone',
        contactTime: cd.contactTime ?? property.contactTime ?? 'anytime',
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve seller contact details. Please try sending an inquiry.',
    });
  }
}