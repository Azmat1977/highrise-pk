// models/AutomationSequence.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION SEQUENCE MODEL — Highrise.pk
// Defines a drip campaign: trigger + ordered steps + filters
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────

export type AutomationTrigger =
  | 'subscriber_joined'   // New newsletter subscriber verified
  | 'lead_created'        // New lead inquiry submitted
  | 'lead_status_changed' // Lead moved to qualified/hot
  | 'manual';             // Admin manually enrolls

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface IAutomationStep {
  stepNumber: number;       // 1-based ordering
  delayDays: number;        // 0 = immediate, 1 = next day, etc.
  subject: string;
  previewText?: string;
  content: string;          // HTML email body
  fromName?: string;
  fromEmail?: string;
}

export interface ISequenceFilters {
  // For subscriber_joined trigger
  subscriberSource?: string[];    // e.g. ['website', 'popup']

  // For lead_created / lead_status_changed triggers
  leadCities?: string[];          // e.g. ['Karachi', 'Lahore']
  leadTypes?: string[];           // e.g. ['property_inquiry']
  leadStatuses?: string[];        // e.g. ['qualified', 'hot']
  leadPriorities?: string[];      // e.g. ['high', 'urgent']
  entityTypes?: string[];         // e.g. ['project', 'property']
}

export interface IAutomationSequence extends Document {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  status: SequenceStatus;

  steps: IAutomationStep[];

  filters: ISequenceFilters;

  // Default sender (overridable per step)
  defaultFromName?: string;
  defaultFromEmail?: string;

  // Stats (denormalized for dashboard speed)
  stats: {
    totalEnrolled: number;
    totalActive: number;
    totalCompleted: number;
    totalCancelled: number;
    totalFailed: number;
    emailsSent: number;
  };

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────

const AutomationStepSchema = new Schema<IAutomationStep>(
  {
    stepNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    delayDays: {
      type: Number,
      required: true,
      min: 0,
      max: 365,
      default: 0,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'Subject cannot exceed 255 characters'],
    },
    previewText: {
      type: String,
      trim: true,
      maxlength: [200, 'Preview text cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
      maxlength: [500_000, 'Email content too large'],
    },
    fromName: {
      type: String,
      trim: true,
      maxlength: [100, 'From name cannot exceed 100 characters'],
    },
    fromEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'From email cannot exceed 254 characters'],
    },
  },
  { _id: false }
);

const SequenceFiltersSchema = new Schema<ISequenceFilters>(
  {
    subscriberSource: [{ type: String, trim: true, maxlength: 50 }],
    leadCities:       [{ type: String, trim: true, maxlength: 100 }],
    leadTypes:        [{ type: String, trim: true, maxlength: 50 }],
    leadStatuses:     [{ type: String, trim: true, maxlength: 50 }],
    leadPriorities:   [{ type: String, trim: true, maxlength: 20 }],
    entityTypes:      [{ type: String, trim: true, maxlength: 20 }],
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────

const AutomationSequenceSchema = new Schema<IAutomationSequence>(
  {
    name: {
      type: String,
      required: [true, 'Sequence name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    trigger: {
      type: String,
      required: [true, 'Trigger is required'],
      enum: ['subscriber_joined', 'lead_created', 'lead_status_changed', 'manual'],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },

    steps: {
      type: [AutomationStepSchema],
      default: [],
      validate: {
        validator: (steps: IAutomationStep[]) => steps.length <= 20,
        message: 'Maximum 20 steps per sequence',
      },
    },

    filters: {
      type: SequenceFiltersSchema,
      default: () => ({}),
    },

    defaultFromName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    defaultFromEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    stats: {
      totalEnrolled:  { type: Number, default: 0, min: 0 },
      totalActive:    { type: Number, default: 0, min: 0 },
      totalCompleted: { type: Number, default: 0, min: 0 },
      totalCancelled: { type: Number, default: 0, min: 0 },
      totalFailed:    { type: Number, default: 0, min: 0 },
      emailsSent:     { type: Number, default: 0, min: 0 },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────

AutomationSequenceSchema.index({ status: 1, trigger: 1 });
AutomationSequenceSchema.index({ status: 1, createdAt: -1 });
AutomationSequenceSchema.index({ createdBy: 1 });

// ─── Model Export ─────────────────────────────────────────────

const AutomationSequence =
  mongoose.models.AutomationSequence ||
  mongoose.model<IAutomationSequence>(
    'AutomationSequence',
    AutomationSequenceSchema
  );

export default AutomationSequence;