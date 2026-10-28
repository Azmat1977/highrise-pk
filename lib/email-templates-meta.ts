// ========== FILE: lib/email-templates-meta.ts ==========
// 🔒 CLIENT-SAFE Email Template Metadata
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Expose ONLY template metadata (id, name, description, subject)
//   to client components — WITHOUT pulling in server-only
//   dependencies like nodemailer, dompurify, or email.ts helpers.
//
// USAGE:
//   Client components (new.tsx, edit.tsx):
//     import { emailTemplatesMeta } from '@/lib/email-templates-meta';
//
//   Server-only code (API routes):
//     import { emailTemplates } from '@/lib/email-templates';
//
// WHY THIS EXISTS:
//   lib/email-templates.ts imports @/lib/email (nodemailer) which
//   uses Node.js 'fs' module. Bundling that for the browser breaks
//   the build. This file has ZERO server dependencies.
// ═══════════════════════════════════════════════════════════════

export interface EmailTemplateMeta {
  id:          string;
  name:        string;
  description: string;
  subject:     string;
  preview:     string;
}

/**
 * Template metadata — safe to import in browser components.
 * Keep this in sync with emailTemplates in lib/email-templates.ts.
 */
export const emailTemplatesMeta: EmailTemplateMeta[] = [
  {
    id:          'welcome',
    name:        'Welcome Email',
    description: 'Sent to new subscribers',
    subject:     'Welcome to Highrise.pk Newsletter! 🏠',
    preview:     'Thank you for joining our community of real estate enthusiasts.',
  },
  {
    id:          'weekly_update',
    name:        'Weekly Update',
    description: 'Weekly newsletter with market updates',
    subject:     'This Week in Real Estate: {{date}}',
    preview:     'Market trends, featured properties, and expert insights.',
  },
  {
    id:          'property_alert',
    name:        'Property Alert',
    description: 'Alert subscribers about new properties matching their criteria',
    subject:     'New Properties Matching Your Criteria! 🔔',
    preview:     'Check out these new properties that match your saved search.',
  },
  {
    id:          'market_insights',
    name:        'Market Insights',
    description: 'Deep dive into market trends and analysis',
    subject:     'Market Insights: {{topic}}',
    preview:     'Expert analysis and trends in the real estate market.',
  },
  {
    id:          'custom',
    name:        'Custom Template',
    description: 'Create your own email design',
    subject:     '{{subject}}',
    preview:     'Custom email content',
  },
];

/**
 * Get template metadata by ID.
 */
export function getTemplateMetaById(id: string): EmailTemplateMeta | undefined {
  return emailTemplatesMeta.find((t) => t.id === id);
}
// ========== END OF FILE ==========