// pages/api/admin/send-email.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'highrise-nodemailer';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Email from '@/models/Email';
import EmailTemplate from '@/models/EmailTemplate';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 20_000;
const MAX_NAME = 120;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch] || ch));
}
function cleanHeader(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\r\n]/g, ' ').trim().slice(0, max) : '';
}
function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value);
}
function htmlEmail(toName: string, message: string): string {
  const safeName = escapeHtml(toName || 'User');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:40px 0"><table style="width:100%;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><tr><td style="background:linear-gradient(135deg,#029bba 0%,#017a8a 100%);padding:30px 40px;text-align:center"><h1 style="margin:0;color:#fff;font-size:24px">Highrise.pk</h1></td></tr><tr><td style="padding:40px"><p style="color:#333;font-size:16px">Dear ${safeName},</p><div style="color:#555;font-size:15px;line-height:1.8">${safeMessage}</div></td></tr><tr><td style="background:#f8f9fa;padding:30px 40px;border-top:1px solid #eee"><p style="margin:0;color:#666;font-size:14px">Best Regards,<br><strong style="color:#029bba">Highrise.pk Team</strong></p></td></tr></table></td></tr></table></body></html>`;
}
function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
  const port = Number.parseInt(process.env.EMAIL_PORT || '465', 10);
  if (!host || !user || !pass || !Number.isFinite(port)) throw new Error('EMAIL_NOT_CONFIGURED');
  const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : port === 465;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success:false, message:'Method not allowed' }); }

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) { sendRateLimitResponse(res, rl); return; }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const to = cleanHeader(req.body?.to, 254);
  const toName = cleanHeader(req.body?.toName, MAX_NAME);
  const subject = cleanHeader(req.body?.subject, MAX_SUBJECT);
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, MAX_MESSAGE + 1) : '';
  const userId = typeof req.body?.userId === 'string' && mongoose.Types.ObjectId.isValid(req.body.userId) ? req.body.userId : undefined;
  const templateId = typeof req.body?.templateId === 'string' && mongoose.Types.ObjectId.isValid(req.body.templateId) ? req.body.templateId : undefined;

  if (!validEmail(to) || !subject || !message || message.length > MAX_MESSAGE) return res.status(400).json({ success:false, message:'Invalid email request' });

  try {
    await dbConnect();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!validEmail(fromEmail)) return res.status(500).json({ success:false, message:'Email service not configured' });
    const htmlContent = htmlEmail(toName, message);
    const emailRecord = await Email.create({ to, toName, from: fromEmail, subject, message, htmlContent, status:'pending', userId, templateId, sentBy: auth.email || auth.id, sentAt:new Date() });
    try {
      const transporter = createTransporter();
      await transporter.sendMail({ from: `"Highrise.pk" <${fromEmail}>`, to, subject, text: message, html: htmlContent });
      emailRecord.status = 'sent';
      await emailRecord.save();
      if (templateId) await EmailTemplate.updateOne({ _id: templateId }, { $inc: { usageCount: 1 } });
      return res.status(200).json({ success:true, message:'Email sent successfully', emailId: emailRecord._id });
    } catch (sendError: unknown) {
      emailRecord.status = 'failed';
      emailRecord.errorMessage = sendError instanceof Error ? sendError.message.slice(0, 500) : 'Send failed';
      await emailRecord.save();
      return res.status(502).json({ success:false, message:'Failed to send email', emailId: emailRecord._id });
    }
  } catch (error: unknown) {
    return res.status(500).json({ success:false, message:'Failed to process email' });
  }
}
