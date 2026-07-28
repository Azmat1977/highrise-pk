// models/CampaignAnalytics.ts
// Per-recipient tracking record for campaign analytics
// One document per recipient per campaign

import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaignAnalytics extends Document {
  // ─── References ───────────────────────────────
  campaignId:    mongoose.Types.ObjectId;  // → NewsletterCampaign
  recipientId:   string;                   // Subscriber._id or Lead._id (string for flexibility)
  recipientType: 'subscriber' | 'lead';
  email:         string;                   // Normalized recipient email
  name:          string;                   // Recipient display name

  // ─── Send tracking ────────────────────────────
  sentAt:        Date;
  token:         string;                   // Crypto-secure token (open + click auth)

  // ─── Open tracking ────────────────────────────
  openCount:     number;                   // Total times opened (pixel loads)
  firstOpenedAt: Date | null;
  lastOpenedAt:  Date | null;
  openUserAgents: string[];                // Email clients used

  // ─── Click tracking ───────────────────────────
  clickCount:    number;
  firstClickedAt: Date | null;
  lastClickedAt:  Date | null;
  clickedUrls:   Array<{
    url:       string;
    count:     number;
    firstAt:   Date;
    lastAt:    Date;
  }>;

  // ─── Geographic ───────────────────────────────
  openIPs:       string[];                 // Hashed IPs (privacy-safe)

  // ─── A/B Test ─────────────────────────────────────────────
  variant:       'a' | 'b';   // Which subject line variant this recipient received

  // ─── Status ───────────────────────────────────────────────
  bounced:       boolean;
  unsubscribed:  boolean;
  unsubscribedAt: Date | null;

  createdAt:     Date;
  updatedAt:     Date;
}

const ClickedUrlSchema = new Schema(
  {
    url:     { type: String, required: true, maxlength: 2048 },
    count:   { type: Number, default: 1 },
    firstAt: { type: Date,   default: Date.now },
    lastAt:  { type: Date,   default: Date.now },
  },
  { _id: false }
);

const CampaignAnalyticsSchema = new Schema<ICampaignAnalytics>(
  {
    campaignId: {
      type:     Schema.Types.ObjectId,
      ref:      'NewsletterCampaign',
      required: true,
      index:    true,
    },
    recipientId: {
      type:     String,
      required: true,
    },
    recipientType: {
      type:     String,
      enum:     ['subscriber', 'lead'],
      required: true,
    },
    email: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
    },
    name: {
      type:    String,
      default: '',
      trim:    true,
    },

    // Send
    sentAt: {
      type:    Date,
      default: Date.now,
    },
    token: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    // Opens
    openCount:     { type: Number, default: 0, min: 0 },
    firstOpenedAt: { type: Date,   default: null },
    lastOpenedAt:  { type: Date,   default: null },
    openUserAgents: {
      type:    [String],
      default: [],
    },

    // Clicks
    clickCount:     { type: Number, default: 0, min: 0 },
    firstClickedAt: { type: Date,   default: null },
    lastClickedAt:  { type: Date,   default: null },
    clickedUrls: {
      type:    [ClickedUrlSchema],
      default: [],
    },

    // Geographic
    openIPs: {
      type:    [String],
      default: [],
    },

    // A/B Test
    variant: {
      type:    String,
      enum:    ['a', 'b'],
      default: 'a',
    },

    // Status
    bounced:       { type: Boolean, default: false },
    unsubscribed:  { type: Boolean, default: false },
    unsubscribedAt:{ type: Date,    default: null },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Fast lookup by campaign (for analytics dashboard)
CampaignAnalyticsSchema.index({ campaignId: 1, email: 1 });
// Fast lookup by campaign + recipient type (for breakdown)
CampaignAnalyticsSchema.index({ campaignId: 1, recipientType: 1 });
// Fast lookup by campaign + opened (for open rate)
CampaignAnalyticsSchema.index({ campaignId: 1, openCount: 1 });
// Fast lookup by campaign + clicked (for click rate)
CampaignAnalyticsSchema.index({ campaignId: 1, clickCount: 1 });
// Fast lookup by campaign + variant (for A/B comparison)
CampaignAnalyticsSchema.index({ campaignId: 1, variant: 1 });

const CampaignAnalytics =
  mongoose.models.CampaignAnalytics ||
  mongoose.model<ICampaignAnalytics>('CampaignAnalytics', CampaignAnalyticsSchema);

export default CampaignAnalytics;