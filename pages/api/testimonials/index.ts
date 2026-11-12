import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import Testimonial from '@/models/Testimonial';

// NOTE: if your project already has a db helper (e.g. lib/dbConnect.ts),
// import that instead and delete the cached connect below — avoid double connections.
const MONGODB_URI = process.env.MONGODB_URI || '';

declare global {
  // eslint-disable-next-line no-var
  var __hrMongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

async function dbConnect() {
  const cached = global.__hrMongoose ?? { conn: null, promise: null };
  global.__hrMongoose = cached;
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const testimonials = await Testimonial.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .limit(12)
      .lean();
    return res.status(200).json({ success: true, testimonials });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load testimonials' });
  }
}