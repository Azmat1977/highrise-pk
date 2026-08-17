import mongoose, { Schema, type Document, type Model } from "mongoose";

export type PropertyCleanupJobType = "cloudinary" | "decision_state";
export type PropertyCleanupJobStatus = "pending" | "processing" | "completed" | "failed";

export interface IPropertyCleanupJob extends Document {
  propertyId: mongoose.Types.ObjectId;
  jobType: PropertyCleanupJobType;
  dedupeHash: string;
  encryptedPayload: string;
  status: PropertyCleanupJobStatus;
  attempts: number;
  availableAt: Date;
  leaseUntil?: Date | null;
  lastError?: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyCleanupJobSchema = new Schema<IPropertyCleanupJob>(
  {
    propertyId: { type: Schema.Types.ObjectId, required: true, index: true },
    jobType: { type: String, enum: ["cloudinary", "decision_state"], required: true, index: true },
    dedupeHash: { type: String, required: true, unique: true, index: true, maxlength: 64 },
    encryptedPayload: { type: String, required: true, maxlength: 10000 },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending", index: true },
    attempts: { type: Number, default: 0, min: 0 },
    availableAt: { type: Date, default: Date.now, index: true },
    leaseUntil: { type: Date, default: null, index: true },
    lastError: { type: String, default: null, maxlength: 1000 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PropertyCleanupJobSchema.index({ status: 1, availableAt: 1, leaseUntil: 1, createdAt: 1 });
PropertyCleanupJobSchema.index({ propertyId: 1, status: 1 });

const PropertyCleanupJob: Model<IPropertyCleanupJob> =
  (mongoose.models.PropertyCleanupJob as Model<IPropertyCleanupJob>) ||
  mongoose.model<IPropertyCleanupJob>("PropertyCleanupJob", PropertyCleanupJobSchema);

export default PropertyCleanupJob;
