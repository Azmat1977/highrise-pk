// models/Review.ts
// ═══════════════════════════════════════════════════════════════
// REVIEW MODEL - Highrise.pk
// Universal review system for properties, projects, developers, agents
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ReviewEntityType = 
  | 'property' 
  | 'project' 
  | 'developer' 
  | 'agent'
  | 'contractor' 
  | 'architect' 
  | 'vendor'
  | 'interior_designer';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IReviewResponse {
  content: string;
  respondedBy: Types.ObjectId;
  respondedByName: string;
  respondedAt: Date;
}

export interface IReviewVote {
  helpful: number;
  notHelpful: number;
  helpfulBy: string[];      // User IDs or IPs
  notHelpfulBy: string[];
}

export interface IReviewMedia {
  type: 'image' | 'video';
  url: string;
  publicId: string;
  caption?: string;
}

// ============================================
// MAIN REVIEW INTERFACE
// ============================================

export interface IReview extends Document {
  // ═══════════════════════════════════════
  // ENTITY REFERENCE (Generic)
  // ═══════════════════════════════════════
  entityType: ReviewEntityType;
  entityId: Types.ObjectId;
  
  // Snapshot for data persistence
  entitySnapshot: {
    name: string;               // Property title / Project name / Developer name
    slug?: string;
    imageUrl?: string;
    city?: string;
  };
  
  // ═══════════════════════════════════════
  // REVIEWER INFO
  // ═══════════════════════════════════════
  userId?: Types.ObjectId;      // If logged in
  reviewerName: string;
  reviewerEmail: string;
  reviewerPhone?: string;
  isVerifiedPurchase: boolean;  // Actually bought/rented?
  isAnonymous: boolean;
  
  // ═══════════════════════════════════════
  // RATING & CONTENT
  // ═══════════════════════════════════════
  rating: number;               // 1-5 stars (required)
  title?: string;               // Review headline
  content: string;              // Review body
  
  // Detailed ratings (optional)
  detailedRatings?: {
    location?: number;          // 1-5
    value?: number;             // Price value
    quality?: number;           // Build quality
    amenities?: number;
    communication?: number;     // For developers/agents
    professionalism?: number;
  };
  
  // Pros and Cons
  pros?: string[];
  cons?: string[];
  
  // ═══════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════
  media?: IReviewMedia[];
  
  // ═══════════════════════════════════════
  // OWNER/DEVELOPER RESPONSE
  // ═══════════════════════════════════════
  response?: IReviewResponse;
  
  // ═══════════════════════════════════════
  // VOTING & HELPFULNESS
  // ═══════════════════════════════════════
  votes: IReviewVote;
  
  // ═══════════════════════════════════════
  // MODERATION
  // ═══════════════════════════════════════
  status: ReviewStatus;
  moderationNotes?: string;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
  
  // Reporting
  isReported: boolean;
  reportCount: number;
  reportReasons?: string[];
  
  // ═══════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════
  verificationDetails?: {
    method?: 'document' | 'transaction' | 'manual';
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    documentUrl?: string;
  };
  
  // ═══════════════════════════════════════
  // FEATURED & HIGHLIGHTS
  // ═══════════════════════════════════════
  isFeatured: boolean;
  featuredAt?: Date;
  featuredBy?: Types.ObjectId;
  
  // ═══════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  deleteReason?: string;
  
  // ═══════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STATIC METHODS INTERFACE
// ============================================

interface IReviewModel extends Model<IReview> {
  getAverageRating(entityType: ReviewEntityType, entityId: Types.ObjectId): Promise<{
    average: number;
    count: number;
    breakdown: { [key: number]: number };
  }>;
  getEntityReviews(
    entityType: ReviewEntityType,
    entityId: Types.ObjectId,
    options?: { limit?: number; skip?: number; status?: ReviewStatus }
  ): Promise<IReview[]>;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const ReviewResponseSchema = new Schema(
  {
    content: { type: String, required: true, maxlength: 2000 },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondedByName: { type: String, required: true },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewVoteSchema = new Schema(
  {
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    helpfulBy: [{ type: String }],
    notHelpfulBy: [{ type: String }],
  },
  { _id: false }
);

const ReviewMediaSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String, maxlength: 200 },
  },
  { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const ReviewSchema = new Schema<IReview>(
  {
    // Entity Reference
    entityType: {
      type: String,
      enum: [
        'property', 
        'project', 
        'developer', 
        'agent', 
        'contractor', 
        'architect', 
        'vendor',
        'interior_designer'
      ],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entitySnapshot: {
      name: { type: String, required: true },
      slug: { type: String },
      imageUrl: { type: String },
      city: { type: String },
    },
    
    // Reviewer Info
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    reviewerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reviewerPhone: {
      type: String,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    
    // Rating & Content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 3000,
    },
    detailedRatings: {
      location: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      amenities: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
    },
    pros: [{ type: String, maxlength: 200 }],
    cons: [{ type: String, maxlength: 200 }],
    
    // Media
    media: [ReviewMediaSchema],
    
    // Response
    response: ReviewResponseSchema,
    
    // Votes
    votes: {
      type: ReviewVoteSchema,
      default: () => ({ helpful: 0, notHelpful: 0, helpfulBy: [], notHelpfulBy: [] }),
    },
    
    // Moderation
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    moderationNotes: { type: String },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    
    // Reporting
    isReported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    reportReasons: [{ type: String }],
    
    // Verification
    verificationDetails: {
      method: { type: String, enum: ['document', 'transaction', 'manual'] },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      documentUrl: { type: String },
    },
    
    // Featured
    isFeatured: { type: Boolean, default: false },
    featuredAt: { type: Date },
    featuredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    
    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deleteReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Primary lookup
ReviewSchema.index({ entityType: 1, entityId: 1, status: 1 });
ReviewSchema.index({ entityType: 1, entityId: 1, rating: -1 });
ReviewSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// User's reviews
ReviewSchema.index({ userId: 1, createdAt: -1 });

// Moderation queue
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ isReported: 1, reportCount: -1 });

// Featured reviews
ReviewSchema.index({ isFeatured: 1, status: 1 });

// Prevent duplicate reviews (one review per user per entity)
ReviewSchema.index(
  { entityType: 1, entityId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

// Text search
ReviewSchema.index({
  title: 'text',
  content: 'text',
  'entitySnapshot.name': 'text',
});

// ============================================
// STATIC METHODS
// ============================================

ReviewSchema.statics.getAverageRating = async function (
  entityType: ReviewEntityType,
  entityId: Types.ObjectId
) {
  const result = await this.aggregate([
    {
      $match: {
        entityType,
        entityId,
        status: 'approved',
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  if (result.length === 0) {
    return { average: 0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  }

  const r = result[0];
  return {
    average: Math.round(r.average * 10) / 10,
    count: r.count,
    breakdown: {
      5: r.star5,
      4: r.star4,
      3: r.star3,
      2: r.star2,
      1: r.star1,
    },
  };
};

ReviewSchema.statics.getEntityReviews = async function (
  entityType: ReviewEntityType,
  entityId: Types.ObjectId,
  options: { limit?: number; skip?: number; status?: ReviewStatus } = {}
) {
  const { limit = 10, skip = 0, status = 'approved' } = options;

  return this.find({
    entityType,
    entityId,
    status,
    isDeleted: false,
  })
    .sort({ isFeatured: -1, 'votes.helpful': -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name profilePictureUrl');
};

// ============================================
// VIRTUAL FIELDS
// ============================================

ReviewSchema.virtual('helpfulnessScore').get(function (this: IReview) {
  const total = this.votes.helpful + this.votes.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.votes.helpful / total) * 100);
});

ReviewSchema.virtual('displayName').get(function (this: IReview) {
  if (this.isAnonymous) {
    return this.reviewerName.charAt(0) + '***';
  }
  return this.reviewerName;
});

// Ensure virtuals included
ReviewSchema.set('toJSON', { virtuals: true });
ReviewSchema.set('toObject', { virtuals: true });

// ============================================
// MODEL EXPORT
// ============================================

const Review: IReviewModel =
  (mongoose.models.Review as IReviewModel) ||
  mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);

export default Review;
