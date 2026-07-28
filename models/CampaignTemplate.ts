// models/CampaignTemplate.ts
// 🏗️ CAMPAIGN TEMPLATE MODEL — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Stores admin-created campaign templates in MongoDB.
//   System templates (hardcoded in TemplateGallery) are separate
//   and never stored here — this model is for CUSTOM templates
//   created by admins from existing campaigns.
//
// FIELDS:
//   name          → Template display name
//   description   → Short description shown in gallery
//   category      → Visual grouping + icon mapping
//   subject       → Default subject line
//   previewText   → Default preview text (inbox snippet)
//   content       → Full HTML content (from TipTap editor)
//   isSystem      → false always (system templates are hardcoded)
//   usageCount    → How many times applied to campaigns
//   createdBy     → Admin who created it
//   lastUsedAt    → Last time it was applied
//   isDeleted     → Soft delete
//   tags          → Optional searchable tags
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

export type TemplateCategory =
  | 'welcome'
  | 'newsletter'
  | 'property_alert'
  | 'market_insights'
  | 'promotion'
  | 'announcement'
  | 'custom';

export interface ICampaignTemplate extends Document {
  name:        string;
  description: string;
  category:    TemplateCategory;
  subject:     string;
  previewText: string;
  content:     string;       // Full HTML — same as campaign.content
  isSystem:    boolean;      // Always false — system templates are hardcoded
  usageCount:  number;       // Incremented each time template is applied
  lastUsedAt:  Date | null;
  tags:        string[];
  thumbnail?:  string;       // Optional future use (screenshot URL)
  createdBy:   mongoose.Types.ObjectId | null;
  isDeleted:   boolean;
  deletedAt:   Date | null;
  createdAt:   Date;
  updatedAt:   Date;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SCHEMA
// ═══════════════════════════════════════════════════════════════

const CampaignTemplateSchema = new Schema<ICampaignTemplate>(
  {
    name: {
      type:      String,
      required:  [true, 'Template name is required'],
      trim:      true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    description: {
      type:      String,
      required:  [true, 'Description is required'],
      trim:      true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },

    category: {
      type:    String,
      enum:    [
        'welcome',
        'newsletter',
        'property_alert',
        'market_insights',
        'promotion',
        'announcement',
        'custom',
      ],
      default: 'custom',
      index:   true,
    },

    subject: {
      type:      String,
      trim:      true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
      default:   '',
    },

    previewText: {
      type:      String,
      trim:      true,
      maxlength: [300, 'Preview text cannot exceed 300 characters'],
      default:   '',
    },

    content: {
      type:     String,
      required: [true, 'Template content is required'],
      // No maxlength here — HTML content can be large
      // Size limit enforced at API level (500KB)
    },

    // Always false — system templates live in TemplateGallery.tsx
    isSystem: {
      type:    Boolean,
      default: false,
    },

    usageCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    lastUsedAt: {
      type:    Date,
      default: null,
    },

    tags: [{
      type:      String,
      trim:      true,
      maxlength: [50, 'Tag cannot exceed 50 characters'],
    }],

    thumbnail: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Thumbnail URL too long'],
      default:   undefined,
    },

    createdBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    deletedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// 🔐 INDEXES
// ═══════════════════════════════════════════════════════════════

// Fast list queries
CampaignTemplateSchema.index({ isDeleted: 1, createdAt: -1 });
CampaignTemplateSchema.index({ isDeleted: 1, category: 1 });
CampaignTemplateSchema.index({ isDeleted: 1, usageCount: -1 });

// Text search on name + description
CampaignTemplateSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { name: 'campaign_template_text_search' }
);

// ═══════════════════════════════════════════════════════════════
// 🔐 PRE-SAVE HOOK
// ═══════════════════════════════════════════════════════════════

// Ensure isSystem is never set to true via API
CampaignTemplateSchema.pre('save', function (next) {
  this.isSystem = false;
  next();
});

// ═══════════════════════════════════════════════════════════════
// 🔐 MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const CampaignTemplate =
  mongoose.models.CampaignTemplate ||
  mongoose.model<ICampaignTemplate>(
    'CampaignTemplate',
    CampaignTemplateSchema
  );

export default CampaignTemplate;