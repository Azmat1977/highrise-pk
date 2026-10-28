// models/EmailTemplate.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IEmailTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  message: string;
  category: "welcome" | "verification" | "notification" | "marketing" | "other";
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["welcome", "verification", "notification", "marketing", "other"],
      default: "other",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Delete old cached model
if (mongoose.models.EmailTemplate) {
  delete mongoose.models.EmailTemplate;
}

const EmailTemplate = model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);

export default EmailTemplate;
