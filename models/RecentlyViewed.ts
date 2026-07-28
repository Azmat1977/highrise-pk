import mongoose, { Schema, Document, Model } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// RECENTLY VIEWED MODEL - Highrise.pk
// Tracks which properties users have viewed
// ═══════════════════════════════════════════════════════════════

export interface IRecentlyViewed extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  viewedAt: Date;
  // Denormalized fields for faster reads (optional but recommended)
  propertySnapshot?: {
    title: string;
    price: number;
    city: string;
    imageUrl?: string;
    propertyType?: string;
    slug?: string;
  };
}

const RecentlyViewedSchema = new Schema<IRecentlyViewed>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Snapshot for faster reads without populate
    propertySnapshot: {
      title: { type: String },
      price: { type: Number },
      city: { type: String },
      imageUrl: { type: String },
      propertyType: { type: String },
      slug: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound unique index: One entry per user-property pair
RecentlyViewedSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// For fetching user's recently viewed (sorted by viewedAt desc)
RecentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

// TTL Index: Auto-delete after 30 days of inactivity
RecentlyViewedSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

RecentlyViewedSchema.statics.addView = async function (
  userId: mongoose.Types.ObjectId,
  propertyId: mongoose.Types.ObjectId,
  snapshot?: IRecentlyViewed['propertySnapshot']
) {
  // Upsert: Update viewedAt if exists, create if not
  return this.findOneAndUpdate(
    { userId, propertyId },
    {
      userId,
      propertyId,
      viewedAt: new Date(),
      ...(snapshot && { propertySnapshot: snapshot }),
    },
    { upsert: true, new: true }
  );
};

RecentlyViewedSchema.statics.getRecentViews = async function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.find({ userId })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .populate({
      path: 'propertyId',
      select: 'title price city images propertyType slug status',
    });
};

RecentlyViewedSchema.statics.clearUserHistory = async function (
  userId: mongoose.Types.ObjectId
) {
  return this.deleteMany({ userId });
};

// ═══════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const RecentlyViewed: Model<IRecentlyViewed> =
  mongoose.models.RecentlyViewed ||
  mongoose.model<IRecentlyViewed>('RecentlyViewed', RecentlyViewedSchema);

export default RecentlyViewed;
