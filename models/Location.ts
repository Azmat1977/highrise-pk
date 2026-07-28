// models/Location.ts
import mongoose, { Schema, models, model } from "mongoose";

const LocationSchema = new Schema(
  {
    city: { type: String, required: true, index: true },
    society: { type: String, required: true, index: true },

    // optional extra detail for future:
    phase: { type: String, default: "" },
    block: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING"],
      default: "ACTIVE",
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// Prevent duplicates: same city + society
LocationSchema.index({ city: 1, society: 1 }, { unique: true });

export default models.Location || model("Location", LocationSchema);
