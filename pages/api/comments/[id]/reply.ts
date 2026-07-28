// C:\dev\highrise-pk\pages\api\comments\[id]\reply.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '@/lib/db';
import Comment from '@/models/Comment';
import mongoose from 'mongoose';
import { rateLimitComment, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';

// ----------------------------------------------------------------------
// 🛡️ 1. SECURITY CONFIGURATION
// ----------------------------------------------------------------------

const BAD_WORDS = ["scam", "fake", "fraud", "casino", "viagra", "crypto"];

// Validation Schema
const replySchema = z.object({
  content: z.string().min(3, "Reply must be at least 3 characters").max(1000, "Reply cannot exceed 1000 characters"),
  guestName: z.string().min(2).max(50).optional(),
  guestEmail: z.string().email().optional(),
  turnstileToken: z.string().optional(),
});

const sanitize = (str: string) => str.replace(/<[^>]*>?/gm, "").trim();

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  try {
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

// ----------------------------------------------------------------------
// 🚀 2. API HANDLER
// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID' });
  }

  try {
    // 🛡️ 1. Rate Limiting Apply
    const rateLimitResult = await rateLimitComment(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // 🛡️ 2. Zod Validation Check
    const validation = replySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error.issues[0].message 
      });
    }

    const { content, guestName, guestEmail, turnstileToken } = validation.data;

    // 🛡️ 3. Profanity Filter
    if (BAD_WORDS.some(word => content.toLowerCase().includes(word))) {
      return res.status(400).json({ success: false, message: 'Reply contains prohibited language' });
    }

    // 🛡️ 4. Determine User Identity
    const session = await getServerSession(req, res, authOptions);
    let isAdmin = false;
    
    // ✅ FIX: Explicitly define authorData type as strict strings
    let authorData: { name: string; email: string; isAdmin: boolean };

    if (session) {
      isAdmin = session.user.role === 'admin';
      authorData = {
        name: isAdmin ? 'Highrise.pk Team' : (session.user.name || 'User'), // Fallback added
        email: session.user.email || 'no-email@highrise.pk',              // Fallback added
        isAdmin: isAdmin,
      };
    } else {
      if (!guestName || !guestEmail || !turnstileToken) {
        return res.status(401).json({ success: false, message: 'Name, Email and Captcha are required for guests' });
      }

      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return res.status(400).json({ success: false, message: 'Bot verification failed' });
      }

      authorData = {
        name: sanitize(guestName),
        email: guestEmail.toLowerCase(),
        isAdmin: false,
      };
    }

    // 🗄️ 5. Database Operations
    await dbConnect();
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.status !== 'approved' && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reply to unapproved comments',
      });
    }

    if (!comment.replies) {
      comment.replies = [];
    }

    if (comment.replies.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'This comment has reached the maximum number of replies (10)',
      });
    }

    // ✅ FIX: Reply object is now 100% type-safe with IReply
    const reply: any = {
      _id: new mongoose.Types.ObjectId(),
      author: authorData,
      content: sanitize(content),
      createdAt: new Date(),
    };

    comment.replies.push(reply);
    await comment.save();

    return res.status(201).json({
      success: true,
      message: isAdmin ? 'Reply posted successfully' : 'Your reply has been posted',
      reply: {
        _id: reply._id,
        author: {
          name: reply.author.name,
          isAdmin: reply.author.isAdmin,
        },
        content: reply.content,
        createdAt: reply.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Error adding reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error adding reply',
    });
  }
}