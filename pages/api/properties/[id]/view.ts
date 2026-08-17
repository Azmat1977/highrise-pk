//C:\dev\highrise-pk\pages\api\properties\[id]\view.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { rateLimitPropertyView } from '@/lib/rateLimit';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ success: false }); return; }
  const rl = await rateLimitPropertyView(req);
  if (!rl.ok) { res.status(429).json({ success: false }); return; }
  const id = String(req.query.id ?? '');
  if (!mongoose.isValidObjectId(id)) { res.status(400).json({ success: false }); return; }
  await dbConnect();
  const result = await Property.updateOne({ _id: id, ...PUBLIC_PROPERTY_FILTER }, { $inc: { views: 1 } });
  if (!result.matchedCount) { res.status(404).json({ success: false }); return; }
  res.status(204).end();
}
