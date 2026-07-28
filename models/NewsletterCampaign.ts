//C:\dev\highrise-pk\models\NewsletterCampaign.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletterCampaign extends Document {
  title: string;
  subject: string;
  content: string;
  template: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor: Date | null;
  sentAt: Date | null;
  recipients: {
    total: number;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  segments: string[];
  tags: string[];

  // ────────────────
  // 🆕 ENTERPRISE FIELDS (Phase 1)
  // ────────────────
  previewText?: string;     // Inbox preview snippet
  fromName?: string;        // Optional sender name override
  fromEmail?: string;       // Optional sender email override
  replyTo?: string;         // Optional reply-to email
  autoSavedAt?: Date | null; // Last auto-save timestamp

  // ────────────────
  // 🆕 PHASE 2 — LEAD TARGETING & PERSONALIZATION
  // ────────────────
  recipientSource?: 'subscribers' | 'leads' | 'both';
  leadFilters?: {
    cities?:        string[];    // ['Karachi', 'Lahore']
    statuses?:      string[];    // ['new', 'contacted', 'qualified']
    temperatures?:  string[];    // ['hot', 'burning']
    budgetTiers?:   string[];    // ['1Cr_3Cr', '3Cr_5Cr']
    sources?:       string[];    // ['project_page', 'aria']
    leadTypes?:     string[];    // ['property_inquiry']
    priorities?:    string[];    // ['high', 'urgent']
    minScore?:      number;      // 0-100
    maxScore?:      number;      // 0-100
    dateFrom?:      Date | null; // Lead created after
    dateTo?:        Date | null; // Lead created before
    assignedTo?:    string;      // Email of assigned person
  };
  mergeTagsEnabled?: boolean;    // Enable {{name}}, {{city}} etc.

  // ────────────────
  // 🆕 OPTION C — A/B TESTING
  // ────────────────
  abTest?: {
    enabled:           boolean;
    variantBSubject:   string;        // Variant B subject line
    variantBPreview:   string;        // Variant B preview text (optional)
    splitPercent:      number;        // % of recipients who get variant A (default 50)
    winnerMetric:      'open_rate' | 'click_rate';
    winner:            'a' | 'b' | null;
    winnerPickedAt:    Date | null;
    status:            'not_started' | 'testing' | 'winner_picked';
    testDurationHours: number;        // Hours before auto-pick (default 24)
    variantASent:      number;        // Recipients who got A
    variantBSent:      number;        // Recipients who got B
    variantAOpens:     number;        // Tracked opens for A
    variantBOpens:     number;        // Tracked opens for B
    variantAClicks:    number;        // Tracked clicks for A
    variantBClicks:    number;        // Tracked clicks for B
  };

  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterCampaignSchema = new Schema<INewsletterCampaign>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    template: {
      type: String,
      enum: ['welcome', 'weekly_update', 'property_alert', 'market_insights', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    recipients: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
    },
    segments: [{
      type: String,
      enum: ['all', 'active', 'new', 'inactive', 'premium'],
    }],
    tags: [{
      type: String,
      trim: true,
    }],

    // ────────────────
    // 🆕 ENTERPRISE FIELDS (Phase 1)
    // ────────────────
    previewText: {
      type: String,
      trim: true,
      maxlength: 300, // Gmail snippet limit safety
      default: '',
    },
    fromName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    fromEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: '',
    },
    replyTo: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: '',
    },
    autoSavedAt: {
      type: Date,
      default: null,
    },

    // ────────────────
    // 🆕 PHASE 2 — LEAD TARGETING & PERSONALIZATION
    // ────────────────
    recipientSource: {
      type: String,
      enum: ['subscribers', 'leads', 'both'],
      default: 'subscribers',
    },
    leadFilters: {
      cities:       { type: [String], default: [] },
      statuses:     { type: [String], default: [] },
      temperatures: { type: [String], default: [] },
      budgetTiers:  { type: [String], default: [] },
      sources:      { type: [String], default: [] },
      leadTypes:    { type: [String], default: [] },
      priorities:   { type: [String], default: [] },
      minScore:     { type: Number, min: 0, max: 100, default: 0 },
      maxScore:     { type: Number, min: 0, max: 100, default: 100 },
      dateFrom:     { type: Date, default: null },
      dateTo:       { type: Date, default: null },
      assignedTo:   { type: String, trim: true, lowercase: true, default: '' },
    },
    mergeTagsEnabled: {
      type: Boolean,
      default: true,
    },

    // ────────────────
    // 🆕 OPTION C — A/B TESTING
    // ────────────────
    abTest: {
      enabled:           { type: Boolean, default: false },
      variantBSubject:   { type: String, trim: true, maxlength: 200, default: '' },
      variantBPreview:   { type: String, trim: true, maxlength: 300, default: '' },
      splitPercent:      { type: Number, min: 10, max: 90, default: 50 },
      winnerMetric: {
        type:    String,
        enum:    ['open_rate', 'click_rate'],
        default: 'open_rate',
      },
      winner:            { type: String, enum: ['a', 'b', null], default: null },
      winnerPickedAt:    { type: Date, default: null },
      status: {
        type:    String,
        enum:    ['not_started', 'testing', 'winner_picked'],
        default: 'not_started',
      },
      testDurationHours: { type: Number, min: 1, max: 168, default: 24 },
      variantASent:      { type: Number, default: 0, min: 0 },
      variantBSent:      { type: Number, default: 0, min: 0 },
      variantAOpens:     { type: Number, default: 0, min: 0 },
      variantBOpens:     { type: Number, default: 0, min: 0 },
      variantAClicks:    { type: Number, default: 0, min: 0 },
      variantBClicks:    { type: Number, default: 0, min: 0 },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
NewsletterCampaignSchema.index({ status: 1 });
NewsletterCampaignSchema.index({ scheduledFor: 1 });
NewsletterCampaignSchema.index({ createdAt: -1 });

const NewsletterCampaign = 
  mongoose.models.NewsletterCampaign || 
  mongoose.model<INewsletterCampaign>('NewsletterCampaign', NewsletterCampaignSchema);

export default NewsletterCampaign;
