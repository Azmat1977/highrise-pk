// models/Email.ts

import mongoose, { Schema, model, Document } from "mongoose";

export interface IEmail extends Document {
  _id: mongoose.Types.ObjectId;

  // Basic email info
  to: string;
  toName?: string;
  from: string;
  subject: string;
  message: string;
  htmlContent?: string;

  // Status / error
  status: "sent" | "failed" | "pending";
  errorMessage?: string;

  // Relations
  userId?: mongoose.Types.ObjectId;     // Reference to user if sent to a user
  templateId?: mongoose.Types.ObjectId; // Reference to template if used

  // Lead relation
  leadId?: mongoose.Types.ObjectId;     // Reference to Lead
  leadName?: string;                    // Snapshot of lead name (for quick display)

  // Soft delete / trash
  isArchived?: boolean;                 // true = moved to Trash
  archivedAt?: Date;                    // when it was archived
  archivedBy?: string;                  // who archived it (email/name)

  // Meta
  sentBy: string;                       // Admin/Developer who sent the email
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSchema = new Schema<IEmail>(
  {
    to: {
      type: String,
      required: true,
      index: true,
    },
    toName: {
      type: String,
      default: "",
    },
    from: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
    },

    // Status / error
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "pending",
      index: true,
    },
    errorMessage: {
      type: String,
      default: "",
    },

    // Relations
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "EmailTemplate",
    },

    // Lead relation
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },
    leadName: {
      type: String,
      default: "",
    },

    // Soft delete / trash
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: String,
      default: "",
    },

    // Meta
    sentBy: {
      type: String,
      default: "Admin",
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Indexes
EmailSchema.index({ createdAt: -1 });
EmailSchema.index({ status: 1, createdAt: -1 });
EmailSchema.index({ leadId: 1, createdAt: -1 });
EmailSchema.index({ isArchived: 1, createdAt: -1 });

// Delete old cached model (for Next.js hot reload)
if (mongoose.models.Email) {
  delete mongoose.models.Email;
}

const Email = model<IEmail>("Email", EmailSchema);

export default Email;
