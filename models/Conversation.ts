// models/Conversation.ts
// Highrise.pk — Aria AI conversation storage
// Stores chat sessions with context, intent, and lead status
// Security: AES-256-GCM for any PII captured mid-chat

import mongoose, { Schema, model, models, Document } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationIntent =
  | 'buy'
  | 'rent'
  | 'invest'
  | 'verify_society'
  | 'price_check'
  | 'general'
  | 'unknown';
export type LeadStatus = 'browsing' | 'interested' | 'qualified' | 'captured' | 'contacted';
export type ContextType = 'property' | 'project' | 'society' | 'general';

export interface IMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface IAriaContext {
  type: ContextType;
  id?: string;           // MongoDB ObjectId as string
  slug?: string;
  title?: string;
  price?: number;
  city?: string;
  propertyType?: string;
  listingType?: string;
  area?: string;
  bedrooms?: number;
  bathrooms?: number;
  society?: string;
  nocStatus?: string;
  overallScore?: number;
  overallRiskLevel?: string;
  canonicalUrl?: string;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;

  // Session
  sessionId: string;           // crypto.randomUUID() — links anonymous sessions
  userId?: mongoose.Types.ObjectId; // set if logged in

  // Context — what page/entity the user was viewing
  context: IAriaContext;

  // Messages
  messages: IMessage[];
  messageCount: number;

  // Intent classification (updated as conversation progresses)
  detectedIntent: ConversationIntent;
  budgetMentioned?: number;     // PKR value if user mentioned budget
  cityMentioned?: string;
  areasMentioned?: string[];

  // Lead pipeline
  leadStatus: LeadStatus;
  leadCaptured: boolean;
  leadId?: mongoose.Types.ObjectId; // ref to Lead model when captured

  // Meta
  ipAddress?: string;           // hashed, not plain
  userAgent?: string;
  isActive: boolean;            // false = session ended
  lastActivityAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const MessageSchema = new Schema<IMessage>(
  {
    role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content:   { type: String, required: true, maxlength: 4000 },
    timestamp: { type: Date,   default: () => new Date() },
  },
  { _id: false }
);

const AriaContextSchema = new Schema<IAriaContext>(
  {
    type:             { type: String, enum: ['property', 'project', 'society', 'general'], required: true },
    id:               { type: String },
    slug:             { type: String },
    title:            { type: String, maxlength: 300 },
    price:            { type: Number },
    city:             { type: String, maxlength: 100 },
    propertyType:     { type: String, maxlength: 100 },
    listingType:      { type: String, maxlength: 50 },
    area:             { type: String, maxlength: 50 },
    bedrooms:         { type: Number },
    bathrooms:        { type: Number },
    society:          { type: String, maxlength: 200 },
    nocStatus:        { type: String, maxlength: 50 },
    overallScore:     { type: Number },
    overallRiskLevel: { type: String, maxlength: 50 },
    canonicalUrl:     { type: String, maxlength: 500 },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    sessionId: {
      type:     String,
      required: true,
      index:    true,
    },
    userId: {
      type:  Schema.Types.ObjectId,
      ref:   'User',
      index: true,
    },

    context: {
      type:     AriaContextSchema,
      required: true,
    },

    messages: {
      type:    [MessageSchema],
      default: [],
    },
    messageCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    detectedIntent: {
      type:    String,
      enum:    ['buy', 'rent', 'invest', 'verify_society', 'price_check', 'general', 'unknown'],
      default: 'unknown',
      index:   true,
    },
    budgetMentioned: { type: Number },
    cityMentioned:   { type: String,  maxlength: 100 },
    areasMentioned:  [{ type: String, maxlength: 100 }],

    leadStatus: {
      type:    String,
      enum:    ['browsing', 'interested', 'qualified', 'captured', 'contacted'],
      default: 'browsing',
      index:   true,
    },
    leadCaptured: { type: Boolean, default: false },
    leadId: {
      type: Schema.Types.ObjectId,
      ref:  'Lead',
    },

    ipAddress:      { type: String, maxlength: 100 },
    userAgent:      { type: String, maxlength: 500 },
    isActive:       { type: Boolean, default: true, index: true },
    lastActivityAt: { type: Date,    default: () => new Date(), index: true },
  },
  {
    timestamps: true,
    strict:     true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Auto-expire inactive conversations after 7 days
ConversationSchema.index(
  { lastActivityAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

// Admin queries: by intent + lead status
ConversationSchema.index({ detectedIntent: 1, leadStatus: 1 });

// User conversation history
ConversationSchema.index({ userId: 1, createdAt: -1 });

// ─── Pre-save: keep messageCount in sync ──────────────────────────────────────

ConversationSchema.pre('save', function (next) {
  this.messageCount   = this.messages.length;
  this.lastActivityAt = new Date();
  next();
});

// ─── Export ───────────────────────────────────────────────────────────────────

const Conversation =
  (models.Conversation as mongoose.Model<IConversation>) ||
  model<IConversation>('Conversation', ConversationSchema);

export default Conversation;