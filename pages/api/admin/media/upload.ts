// pages/api/admin/media/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import Media from '@/models/Media';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS, uploadBuffer, getResourceType, type FileCategory, type FolderType } from '@/lib/cloudinary';

const FOLDER_MAP: Record<string, { cloudinary: FolderType; media: 'blog'|'blogs'|'properties'|'projects'|'developers'|'general'|'users'|'settings'; category: FileCategory }> = {
  general: { cloudinary:'general', media:'general', category:'image' },
  properties: { cloudinary:'properties', media:'properties', category:'image' },
  projects: { cloudinary:'projects', media:'projects', category:'image' },
  blogs: { cloudinary:'blog', media:'blogs', category:'image' },
  blog: { cloudinary:'blog', media:'blog', category:'image' },
  users: { cloudinary:'avatars', media:'users', category:'avatar' },
  developers: { cloudinary:'developers', media:'developers', category:'avatar' },
};

function safeString(v: unknown, max: number): string { return typeof v === 'string' ? v.trim().slice(0,max) : ''; }
function decodeDataUrl(value: unknown): { buffer: Buffer; detectedMime?: string } | null {
  if (typeof value !== 'string') return null;
  const m=value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  const raw=m ? m[2] : value;
  if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return null;
  try { return { buffer: Buffer.from(raw,'base64'), detectedMime: m?.[1] }; } catch { return null; }
}

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ success:false, message:'Method not allowed' }); }
  const rl=await rateLimitAdmin(req); if(!rl.ok){ sendRateLimitResponse(res,rl); return; }
  const auth=await requireAdmin(req,res); if(!auth) return;

  const file=decodeDataUrl(req.body?.file);
  const filename=safeString(req.body?.filename,180);
  const mimeType=safeString(req.body?.mimeType,100).toLowerCase();
  const requestedFolder=safeString(req.body?.folder,40).toLowerCase() || 'general';
  const cfg=FOLDER_MAP[requestedFolder] || FOLDER_MAP.general;
  if (!file || !filename || !mimeType || (file.detectedMime && file.detectedMime !== mimeType)) return res.status(400).json({ success:false, message:'Invalid file payload' });
  const allowed = ALLOWED_MIME_TYPES[cfg.category] as readonly string[];
  if (!allowed.includes(mimeType)) return res.status(400).json({ success:false, message:'File type not allowed for this folder' });
  if (file.buffer.length > FILE_SIZE_LIMITS[cfg.category]) return res.status(400).json({ success:false, message:'File exceeds upload size limit' });

  try {
    const result=await uploadBuffer(file.buffer, filename, cfg.cloudinary, cfg.category, { tags:['admin-media'] });
    if (!result.success || !result.publicId || !result.secureUrl) return res.status(400).json({ success:false, message:result.error || 'Upload rejected' });
    await dbConnect();
    const media=await Media.create({
      filename:path.basename(result.publicId), originalName:filename, mimeType, format:path.extname(filename).slice(1).toLowerCase(),
      size:result.size || file.buffer.length, width:result.width || null, height:result.height || null, url:result.secureUrl,
      publicId:result.publicId, resourceType:getResourceType(mimeType), folder:cfg.media,
      alt:safeString(req.body?.alt,200) || path.basename(filename,path.extname(filename)).replace(/[-_]/g,' '),
      caption:safeString(req.body?.caption,500), uploadedBy:auth.id,
    });
    return res.status(201).json({ success:true, message:'File uploaded successfully', media:{ id:media._id.toString(), filename:media.filename, url:media.url, publicId:media.publicId, mimeType:media.mimeType, size:media.size, width:media.width, height:media.height, folder:media.folder } });
  } catch (error: unknown) {
    return res.status(500).json({ success:false, message:'Error uploading file' });
  }
}
