import mongoose, { Schema } from "mongoose";

/**
 * City model
 * - Stores optional Cloudinary image (url + publicId)
 * - Controls visibility & ordering in UI
 * - "isFeaturedOnHomepage" lets you pick which cities appear on homepage (e.g. top 4)
 */
const CitySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },

    // Optional image uploaded by admin (Cloudinary)
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    // Admin controls
    displayOrder: { type: Number, default: 0, min: 0, max: 9999 },
    isActive: { type: Boolean, default: true },
    isFeaturedOnHomepage: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helpful indexes for admin list/sort
CitySchema.index({ isFeaturedOnHomepage: 1, displayOrder: 1 });
CitySchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.models.City || mongoose.model("City", CitySchema);
