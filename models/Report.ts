// C:\dev\highrise-pk\models\Report.ts

import mongoose, { Schema, models, model } from "mongoose";

export type ReportReason =
  | "scam_suspicious"
  | "fake_images"
  | "incorrect_price"
  | "wrong_location"
  | "duplicate_listing"
  | "agent_not_owner"
  | "spam"
  | "other";

const ReportSchema = new Schema(
  {
    entityType: { type: String, required: true, enum: ["property"], index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },

    reason: {
      type: String,
      required: true,
      enum: [
        "scam_suspicious",
        "fake_images",
        "incorrect_price",
        "wrong_location",
        "duplicate_listing",
        "agent_not_owner",
        "spam",
        "other",
      ],
      index: true,
    },

    details: { type: String, required: true, maxlength: 2000 },

    // optional reporter identity (least-privilege: store only what user provides)
    reporterUserId: { type: Schema.Types.ObjectId, required: false, index: true },
    reporterEmail: { type: String, required: false, maxlength: 200 },
    reporterPhone: { type: String, required: false, maxlength: 50 },

    // anti-abuse telemetry (do not store raw IP)
    ipHash: { type: String, required: false, index: true, maxlength: 128 },
    userAgent: { type: String, required: false, maxlength: 500 },

    status: { type: String, required: true, enum: ["open", "reviewing", "resolved", "rejected"], default: "open", index: true },
  },
  { timestamps: true }
);

// helpful index for moderation queue
ReportSchema.index({ status: 1, createdAt: -1 });

export default models.Report || model("Report", ReportSchema);
