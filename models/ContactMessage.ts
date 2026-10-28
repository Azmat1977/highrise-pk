// ========== FILE: models/ContactMessage.ts ==========
// 🔒 CONTACT MESSAGE MODEL - HIGHRISE.PK
// Stores all inbound contact form submissions
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Model } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InquiryType =
  | 'general'
  | 'verify_society'
  | 'fair_price'
  | 'agent_partnership'
  | 'developer_partnership'
  | 'report_fraud'
  | 'media_press'
  | 'careers';

export type MessageStatus = 'new' | 'read' | 'replied' | 'resolved' | 'spam';

export interface IContactMessage extends Document {
  // Sender info
  name: string;
  email: string;
  phone: string;
  city?: string;

  // Message
  inquiryType: InquiryType;
  subject?: string;
  message: string;

  // Status tracking
  status: MessageStatus;
  isUrgent: boolean;          // auto-set for report_fraud
  adminNotes?: string;        // internal notes by admin
  repliedAt?: Date;
  repliedBy?: string;         // admin userId who replied

  // Security / meta
  ipHash: string;             // hashed IP for abuse tracking
  userAgent?: string;
  turnstileVerified: boolean;
  referenceId: string;        // shown to user as ticket number

  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    // Sender
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Message
    inquiryType: {
      type: String,
      required: true,
      enum: [
        'general',
        'verify_society',
        'fair_price',
        'agent_partnership',
        'developer_partnership',
        'report_fraud',
        'media_press',
        'careers',
      ],
      default: 'general',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Status
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'resolved', 'spam'],
      default: 'new',
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    repliedAt: Date,
    repliedBy: {
      type: String,
      trim: true,
    },

    // Security
    ipHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      maxlength: 300,
    },
    turnstileVerified: {
      type: Boolean,
      default: false,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'contact_messages',
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Admin listing — sorted by newest, filtered by status
ContactMessageSchema.index({ status: 1, createdAt: -1 });

// Urgency queue
ContactMessageSchema.index({ isUrgent: 1, status: 1, createdAt: -1 });

// Email lookup (de-dupe check + reply threading)
ContactMessageSchema.index({ email: 1, createdAt: -1 });

// Unique reference ID
ContactMessageSchema.index({ referenceId: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════
// MODEL
// ═══════════════════════════════════════════════════════════════

const ContactMessage: Model<IContactMessage> =
  mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);

export default ContactMessage;

// ========== END OF FILE ==========