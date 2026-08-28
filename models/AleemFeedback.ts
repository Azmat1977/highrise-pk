// models/AleemFeedback.ts
// Highrise.pk — ALEEM AI Feedback & Response Tuning Schema
// Stores user ratings (thumbs up/down) + optional structured reason tags.
// NO PII (no raw names, emails, phones, or raw message text).

import mongoose, { Schema, model, Document, Model } from 'mongoose';

export const FEEDBACK_REASONS = [
  'price_mismatch',
  'not_relevant',
  'unverified_alert',
  'language_issue',
  'other',
] as const;

export type FeedbackReason = typeof FEEDBACK_REASONS[number];
export type FeedbackRating = 'positive' | 'negative';

export interface IAleemFeedback extends Document {
  sessionId: string;
  messageId: string;
  userId?: mongoose.Types.ObjectId;
  rating: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;
  contextType?: string;
  contextSlug?: string;
  ipHash?: string;
  createdAt: Date;
}

const AleemFeedbackSchema = new Schema<IAleemFeedback>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    messageId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    rating: {
      type: String,
      enum: ['positive', 'negative'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: FEEDBACK_REASONS,
      index: true,
    },
    comment: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    contextType: {
      type: String,
      index: true,
    },
    contextSlug: {
      type: String,
    },
    ipHash: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'aleemfeedbacks',
  }
);

// Compound index for prevent duplicate rating per session/message
AleemFeedbackSchema.index({ sessionId: 1, messageId: 1 }, { unique: true });
AleemFeedbackSchema.index({ rating: 1, createdAt: -1 });
AleemFeedbackSchema.index({ reason: 1, createdAt: -1 });

const AleemFeedback =
  (mongoose.models?.AleemFeedback as Model<IAleemFeedback>) ||
  model<IAleemFeedback>('AleemFeedback', AleemFeedbackSchema);

export default AleemFeedback;