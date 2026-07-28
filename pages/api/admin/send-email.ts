// pages/api/admin/send-email.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/db';
import Email from '@/models/Email';
import EmailTemplate from '@/models/EmailTemplate';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Generate HTML content
const generateHtmlContent = (toName: string, message: string, subject: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #029bba 0%, #027a94 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Highrise.pk</h1>
                    <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Pakistan's Premier Real Estate Platform</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Dear ${toName || 'User'},</p>
                    <div style="color: #555555; font-size: 15px; line-height: 1.8;">${message.replace(/\n/g, '<br>')}</div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #666666; font-size: 14px;">
                      Best Regards,<br><strong style="color: #029bba;">Highrise.pk Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const { to, toName, subject, message, userId, templateId } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const htmlContent = generateHtmlContent(toName, message, subject);

    // Create email record first (status: pending)
    const emailRecord = await Email.create({
      to,
      toName: toName || '',
      from: fromEmail,
      subject,
      message,
      htmlContent,
      status: 'pending',
      userId: userId || null,
      templateId: templateId || null,
      sentBy: 'Admin',
      sentAt: new Date(),
    });

    try {
      // Send email
      const info = await transporter.sendMail({
        from: `"Highrise.pk" <${fromEmail}>`,
        to: to,
        subject: subject,
        text: message,
        html: htmlContent,
      });

      // Update email record to sent
      emailRecord.status = 'sent';
      await emailRecord.save();

      // Update template usage count if used
      if (templateId) {
        await EmailTemplate.findByIdAndUpdate(templateId, {
          $inc: { usageCount: 1 }
        });
      }

      console.log('Email sent:', info.messageId);

      return res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: emailRecord._id,
      });

    } catch (sendError: any) {
      // Update email record to failed
      emailRecord.status = 'failed';
      emailRecord.errorMessage = sendError.message;
      await emailRecord.save();

      console.error('Email send error:', sendError);

      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email',
        error: sendError.message,
        emailId: emailRecord._id,
      });
    }

  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process email',
      error: error.message 
    });
  }
}
