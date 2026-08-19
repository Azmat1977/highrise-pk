//C:\dev\highrise-pk\pages\api\admin\api-keys\index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from '@/lib/rateLimit';
import ApiKey from '@/models/ApiKey';
import crypto from 'crypto';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── DB (Third) ───────────────────────────────────────────────
  await dbConnect();


  if (req.method === 'GET') {
    try {
      const keys = await ApiKey.find()
        .select('-hashedKey')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        apiKeys: keys,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching API keys',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, permissions, expiresAt } = req.body;

      if (!name) {
  return res.status(400).json({
    success: false,
    message: "Name is required",
  });
}


      // Generate API key
      const key = 'hrpk_' + crypto.randomBytes(32).toString('hex');
      const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

      const apiKey = await ApiKey.create({
        name,
        key: key.substring(0, 12) + '...' + key.substring(key.length - 4), // Store partial for display
        hashedKey,
        permissions: permissions || ['blog:create', 'blog:read'],
       createdBy: admin.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      // Return the full key ONLY on creation (won't be stored/shown again)
      return res.status(201).json({
        success: true,
        message: 'API key created successfully. Save this key now - it will not be shown again!',
        apiKey: {
          ...apiKey.toObject(),
          fullKey: key, // Only returned on creation!
        },
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Error creating API key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { keyId } = req.body;

      if (!keyId || !mongoose.Types.ObjectId.isValid(keyId)) {
        return res.status(400).json({ success: false, message: 'Invalid key ID' });
      }

      await ApiKey.findByIdAndDelete(keyId);

      return res.status(200).json({
        success: true,
        message: 'API key deleted',
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting API key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
