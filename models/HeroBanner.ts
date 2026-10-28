import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export interface IHeroBanner extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  imageUrl: string;
  imagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  ctaText?: string;
  ctaLink?: string;
  targetType: "internal" | "external" | "project" | "property" | "developer";
  targetId?: mongoose.Types.ObjectId;
  displayOrder: number;
  isActive: boolean;
  isPaidPromotion: boolean;
  sponsorName?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  impressions?: number;
  clicks?: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IHeroBannerModel extends Model<IHeroBanner> {}

const HeroBannerSchema = new Schema<IHeroBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    mobileImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    mobileImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    ctaLink: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    targetType: {
      type: String,
      enum: ["internal", "external", "project", "property", "developer"],
      default: "internal",
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPaidPromotion: {
      type: Boolean,
      default: false,
      index: true,
    },
    sponsorName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: false,
  }
);

HeroBannerSchema.pre("save", function (next) {
  if (this.title) this.title = this.title.trim();
  if (this.subtitle) this.subtitle = this.subtitle.trim();
  if (this.imageUrl) this.imageUrl = this.imageUrl.trim();
  if (this.mobileImageUrl) this.mobileImageUrl = this.mobileImageUrl.trim();
  if (this.ctaText) this.ctaText = this.ctaText.trim();
  if (this.ctaLink) this.ctaLink = this.ctaLink.trim();
  if (this.sponsorName) this.sponsorName = this.sponsorName.trim();
  next();
});

const HeroBanner =
  (models.HeroBanner as IHeroBannerModel) ||
  model<IHeroBanner, IHeroBannerModel>("HeroBanner", HeroBannerSchema);

export default HeroBanner;
