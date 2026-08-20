/**
 * PATCH /api/favorites/notes
 *
 * Updates the private notes for a specific favorite.
 *
 * Body: { entityType, entityId, notes }
 * Notes: max 500 chars, trimmed, HTML stripped
 *
 * Security:
 *   → Auth required (session)
 *   → Rate limited (30 req/min per IP)
 *   → Zod validation
 *   → Ownership verified (user can only update their own favorites)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Favorite from '@/models/Favorite';

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const NotesSchema = z.object({
  entityType: z.enum(['property', 'project', 'unit']),
  entityId:   z.string().min(1).max(100),
  notes:      z.string().max(500),
});

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'no-store');
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.setHeader('Allow', 'PATCH, POST');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis }     = await import('@upstash/redis');

    const ratelimit = new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix:  'rl:favorites:notes',
    });

    const { success } = await ratelimit.limit(clientIp);
    if (!success) {
      res.status(429).json({ success: false, error: 'Too many requests' });
      return;
    }
  } catch {
    // Fail-open
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const userId = auth.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ success: false, error: 'Invalid user ID' });
    return;
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  const parsed = NotesSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid input' });
    return;
  }

  const { entityType, entityId, notes } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    res.status(400).json({ success: false, error: 'Invalid entity ID' });
    return;
  }

  await dbConnect();

  try {
    // Sanitize notes (strip HTML tags, trim, limit)
    const cleanNotes = String(notes)
      .replace(/<[^>]*>/g, '')  // Strip HTML
      .trim()
      .slice(0, 500);

    const userOid   = new mongoose.Types.ObjectId(userId);
    const entityOid = new mongoose.Types.ObjectId(entityId);

    // Update ONLY user's own favorite (ownership implicit in filter)
    const result = await Favorite.findOneAndUpdate(
      {
        $and: [
          { $or: [{ userId: userOid }, { userId }] },
          { $or: [{ entityId: entityOid }, { entityId }] },
          { entityType },
        ],
      },
      { $set: { notes: cleanNotes } },
      { new: true },
    ).maxTimeMS(2000);

    if (!result) {
      res.status(404).json({
        success: false,
        error:   'Favorite not found. Please add it first.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      notes:   cleanNotes,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update notes' });
  }
}