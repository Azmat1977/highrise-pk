//C:\dev\highrise-pk\pages\api\comments\[id]\reply.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Comment from '@/models/Comment';
import { rateLimitComment, sendRateLimitResponse } from '@/lib/rateLimit';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { getRequestIp, verifyTurnstileToken } from '@/lib/turnstileServer';

const ReplySchema = z.object({
  content: z.string().trim().min(3).max(1000),
  author: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email(),
  }).optional(),
  guestName: z.string().trim().min(2).max(100).optional(),
  guestEmail: z.string().email().optional(),
  parentReplyId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  turnstileToken: z.string().optional(),
}).strict();

function sanitize(value: string): string {
  return value.replace(/<[^>]*>?/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 1000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID' });
  }

  const rl = await rateLimitComment(req);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  const parsed = ReplySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, message: 'Invalid reply data' });

  const viewer = await getOptionalAuth(req);
  const suppliedName = parsed.data.author?.name ?? parsed.data.guestName;
  const suppliedEmail = parsed.data.author?.email ?? parsed.data.guestEmail;

  let author: { name: string; email: string; isAdmin: boolean; isVerifiedBuyer: boolean };
  if (viewer) {
    author = {
      name: viewer.name || suppliedName || 'Highrise User',
      email: viewer.email || suppliedEmail || 'no-email@highrise.pk',
      isAdmin:
        viewer.authorityRole === 'admin' ||
        viewer.role === 'admin' ||
        viewer.role === 'superadmin',
      isVerifiedBuyer: false,
    };
  } else {
    if (!suppliedName || !suppliedEmail || !parsed.data.turnstileToken) {
      return res.status(401).json({ success: false, message: 'Name, email and bot verification are required' });
    }
    const captchaOk = await verifyTurnstileToken(parsed.data.turnstileToken, getRequestIp(req));
    if (!captchaOk) return res.status(400).json({ success: false, message: 'Bot verification failed' });
    author = { name: suppliedName, email: suppliedEmail.toLowerCase(), isAdmin: false, isVerifiedBuyer: false };
  }

  const content = sanitize(parsed.data.content);
  if (content.length < 3) return res.status(400).json({ success: false, message: 'Reply is too short' });

  await dbConnect();
  const comment = await Comment.findById(rawId);
  if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: 'Comment not found' });
  if (comment.status !== 'approved' && !author.isAdmin) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  if (replies.length >= 100) return res.status(409).json({ success: false, message: 'This discussion has reached its reply limit' });

  let depth = 0;
  let parentReplyId: mongoose.Types.ObjectId | undefined;
  if (parsed.data.parentReplyId) {
    const parent = replies.find((item: any) => String(item?._id) === parsed.data.parentReplyId);
    if (!parent) return res.status(400).json({ success: false, message: 'Parent reply not found' });
    depth = Math.min(Number(parent.depth ?? 0) + 1, 5);
    parentReplyId = new mongoose.Types.ObjectId(parsed.data.parentReplyId);
  }

  comment.replies.push({
    _id: new mongoose.Types.ObjectId(),
    parentReplyId,
    depth,
    author,
    content,
    createdAt: new Date(),
  } as any);
  await comment.save();

  return res.status(201).json({ success: true, message: 'Reply posted successfully' });
}
