// models/AutomationEnrollment.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION ENROLLMENT MODEL — Highrise.pk
// Tracks one recipient's journey through a sequence
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────

export type EnrollmentStatus =
  | 'active'      // Currently progressing through steps
  | 'completed'   // All steps sent successfully
  | 'cancelled'   // Manually cancelled or unsubscribed
  | 'failed';     // Too many consecutive failures

export type RecipientType = 'subscriber' | 'lead';

// Step completion record (successful sends)
export interface IStepCompleted {
  stepNumber: number;
  sentAt:     Date;
}

// Step failure record (failed send attempts)
export interface IStepFailed {
  stepNumber: number;
  failedAt:   Date;
  reason?:    string;
}

export interface IAutomationEnrollment extends Document {
  // ── References ────────────────────────────────────────────
  // sequenceId → AutomationSequence._id
  sequenceId:    mongoose.Types.ObjectId;

  // ── Who is enrolled ───────────────────────────────────────
  recipientType: RecipientType;
  recipientId:   string;         // Subscriber._id or Lead._id as string
  email:         string;         // Denormalized — fast lookup + send
  name:          string;         // Denormalized — merge tags

  // ── Status ────────────────────────────────────────────────
  status:        EnrollmentStatus;

  // ── Progress ──────────────────────────────────────────────
  currentStep:   number;         // Next step to send (1-based)
  nextSendAt:    Date | null;    // When to send next step (cron queries this)
  enrolledAt:    Date;

  // ── Completion ────────────────────────────────────────────
  completedAt?:  Date;
  cancelledAt?:  Date;
  cancelReason?: string;         // 'unsubscribed' | 'bounce' | 'manual' | 'sequence_archived'
  failedAt?:     Date;

  // ── Step tracking ─────────────────────────────────────────
  stepsCompleted: IStepCompleted[];  // Successful step sends
  failedSteps:    IStepFailed[];     // Failed send attempts (for retry logic)

  createdAt:     Date;
  updatedAt:     Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────

const StepCompletedSchema = new Schema<IStepCompleted>(
  {
    stepNumber: { type: Number, required: true },
    sentAt:     { type: Date,   required: true, default: Date.now },
  },
  { _id: false }
);

const StepFailedSchema = new Schema<IStepFailed>(
  {
    stepNumber: { type: Number, required: true },
    failedAt:   { type: Date,   required: true, default: Date.now },
    reason:     { type: String, maxlength: 500 },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────

const AutomationEnrollmentSchema = new Schema<IAutomationEnrollment>(
  {
    // ── References ──────────────────────────────────────────
    sequenceId: {
      type:     Schema.Types.ObjectId,
      ref:      'AutomationSequence',
      required: true,
      index:    true,
    },

    // ── Recipient ────────────────────────────────────────────
    recipientType: {
      type:     String,
      enum:     ['subscriber', 'lead'],
      required: true,
      index:    true,
    },
    recipientId: {
      // Stored as String for flexibility
      // (subscriber _id is ObjectId, lead _id is ObjectId
      //  — both stored as string here for unified querying)
      type:     String,
      required: true,
      index:    true,
    },
    email: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
      index:     true,
    },
    name: {
      type:    String,
      trim:    true,
      maxlength: 200,
      default: '',
    },

    // ── Status ───────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['active', 'completed', 'cancelled', 'failed'],
      default: 'active',
      index:   true,
    },

    // ── Progress ─────────────────────────────────────────────
    currentStep: {
      type:    Number,
      default: 1,
      min:     1,
    },
    nextSendAt: {
      type:    Date,
      default: null,
      index:   true,    // Cron processor: { status:'active', nextSendAt: {$lte: now} }
    },
    enrolledAt: {
      type:    Date,
      default: () => new Date(),
      index:   true,    // Daily cap check: { sequenceId, enrolledAt: {$gte: startOfDay} }
    },

    // ── Completion ───────────────────────────────────────────
    completedAt:  { type: Date, default: null },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, maxlength: 200 },
    failedAt:     { type: Date, default: null },

    // ── Step tracking ─────────────────────────────────────────
    stepsCompleted: {
      type:    [StepCompletedSchema],
      default: [],
    },
    failedSteps: {
      type:    [StepFailedSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────

// PRIMARY: Cron processor query
// Finds all due enrollments: status=active AND nextSendAt <= now
AutomationEnrollmentSchema.index({ status: 1, nextSendAt: 1 });

// Prevent duplicate active enrollment for same recipient+sequence
// (skipIfAlreadyActive check in enrollRecipient.ts)
AutomationEnrollmentSchema.index(
  { sequenceId: 1, recipientId: 1, status: 1 },
  { name: 'sequence_recipient_status' }
);

// Dashboard: view all enrollments for a sequence with status filter
AutomationEnrollmentSchema.index(
  { sequenceId: 1, status: 1, enrolledAt: -1 },
  { name: 'sequence_dashboard' }
);

// Daily cap check: count today's enrollments for a sequence
AutomationEnrollmentSchema.index(
  { sequenceId: 1, enrolledAt: 1 },
  { name: 'sequence_daily_cap' }
);

// Look up all sequences a specific lead/subscriber is enrolled in
AutomationEnrollmentSchema.index(
  { recipientId: 1, recipientType: 1, status: 1 },
  { name: 'recipient_enrollments' }
);

// ─── Model Export ─────────────────────────────────────────────

const AutomationEnrollment =
  mongoose.models.AutomationEnrollment ||
  mongoose.model<IAutomationEnrollment>(
    'AutomationEnrollment',
    AutomationEnrollmentSchema
  );

export default AutomationEnrollment;