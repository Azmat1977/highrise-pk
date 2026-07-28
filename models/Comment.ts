//C:\dev\highrise-pk\models\Comment.ts
// 🔒 ENTERPRISE v2.0 - Modern Comment System with Nested Replies, Edit, Media, Verification & Reputation
import mongoose, { Schema, Document, Model } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPESCRIPT INTERFACES
// ═══════════════════════════════════════════════════════════════

// Media Attachment Interface
export interface IMediaAttachment {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedAt: Date;
}

// Edit History Interface
export interface IEditHistory {
  content: string;
  editedAt: Date;
  editedBy?: string; // IP or user identifier
}

// Sentiment Analysis Interface
export interface ISentiment {
  score: number; // -1 to 1 (-1 = very negative, 0 = neutral, 1 = very positive)
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0 to 1
  analyzedAt: Date;
}

// Author Interface (Enhanced)
export interface IAuthor {
  name: string;
  email: string;
  userId?: mongoose.Types.ObjectId; // If registered user
  isAdmin: boolean;
  isVerifiedBuyer: boolean; // NEW: Verified property buyer
  verificationDate?: Date;
  verifiedPropertyId?: mongoose.Types.ObjectId; // Which property they bought
  reputation?: {
    trustScore: number; // 0-100
    helpfulCommentsCount: number;
    totalCommentsCount: number;
  };
}

// Reply Interface (Enhanced - supports nested replies)
export interface IReply {
  _id: mongoose.Types.ObjectId;
  parentReplyId?: mongoose.Types.ObjectId; // NEW: For nested replies
  depth: number; // NEW: 0 = direct reply, 1+ = nested
  author: IAuthor;
  content: string;
  isEdited: boolean;
  editedAt?: Date;
  editHistory: IEditHistory[];
  likes: mongoose.Types.ObjectId[]; // Changed to user IDs
  attachments: IMediaAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

// Comment Interface (Enhanced)
export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  
  // 🆕 THREADING SUPPORT
  parentCommentId?: mongoose.Types.ObjectId; // For nested comments (future use)
  depth: number; // 0 = root comment
  threadPath: string; // e.g., "root" or "root.123.456"
  
  // Blog Reference
  blogId: mongoose.Types.ObjectId;
  blogSlug: string;
  
  // Author Info (Enhanced)
  author: IAuthor;
  
  // Content
  content: string;
  
  // 🆕 EDIT FUNCTIONALITY
  isEdited: boolean;
  editedAt?: Date;
  editHistory: IEditHistory[];
  editDeadline: Date; // User can edit within 5 minutes
  
  // 🆕 MEDIA ATTACHMENTS
  attachments: IMediaAttachment[];
  
  // Status Management
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  
  // 🆕 ENHANCED VOTING SYSTEM
  likes: mongoose.Types.ObjectId[]; // User IDs who liked (or IP hashes for guests)
  dislikes: mongoose.Types.ObjectId[];
  helpfulVotes: mongoose.Types.ObjectId[]; // NEW: "This was helpful"
  notHelpfulVotes: mongoose.Types.ObjectId[]; // NEW: "Not helpful"
  
  // Deprecated (keep for backward compatibility)
  likedBy: string[]; // Legacy: IPs
  dislikedBy: string[]; // Legacy: IPs
  
  // Replies (Enhanced)
  replies: IReply[];
  
  // 🆕 PINNING
  isPinned: boolean;
  pinnedBy?: mongoose.Types.ObjectId; // Admin who pinned it
  pinnedAt?: Date;
  pinnedReason?: string;
  
  // 🆕 BEST ANSWER (for Q&A blogs)
  isBestAnswer: boolean;
  markedBestBy?: mongoose.Types.ObjectId; // Property owner/admin
  markedBestAt?: Date;
  
  // 🆕 @MENTIONS
  mentions: mongoose.Types.ObjectId[]; // User IDs mentioned
  
  // 🆕 SENTIMENT ANALYSIS
  sentiment?: ISentiment;
  
  // Reporting
  isReported: boolean;
  reportCount: number;
  reportReasons: string[];
  
  // 🆕 MODERATION
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  
  // Deletion
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy?: mongoose.Types.ObjectId;
  
  // 🆕 ANALYTICS
  viewCount: number;
  engagementScore: number; // Calculated: likes + helpful votes + replies
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 MONGOOSE SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Media Attachment Schema
const MediaAttachmentSchema = new Schema<IMediaAttachment>(
  {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
      max: 10485760, // 10MB max
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Edit History Schema
const EditHistorySchema = new Schema<IEditHistory>(
  {
    content: {
      type: String,
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    editedBy: {
      type: String, // IP or user ID
    },
  },
  { _id: false }
);

// Sentiment Schema
const SentimentSchema = new Schema<ISentiment>(
  {
    score: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    label: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Author Schema (Enhanced)
const AuthorSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerifiedBuyer: {
      type: Boolean,
      default: false,
    },
    verificationDate: {
      type: Date,
    },
    verifiedPropertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
    },
    reputation: {
      trustScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
      },
      helpfulCommentsCount: {
        type: Number,
        default: 0,
      },
      totalCommentsCount: {
        type: Number,
        default: 0,
      },
    },
  },
  { _id: false }
);

// Reply Schema (Enhanced - supports nesting)
const ReplySchema = new Schema<IReply>(
  {
    parentReplyId: {
      type: Schema.Types.ObjectId,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 5, // Max 5 levels deep
    },
    author: {
      type: AuthorSchema,
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Reply content is required'],
      trim: true,
      maxlength: [1000, 'Reply cannot exceed 1000 characters'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: [EditHistorySchema],
    likes: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    attachments: [MediaAttachmentSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Comment Schema (Enhanced)
const CommentSchema = new Schema<IComment>(
  {
    // 🆕 Threading
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
    },
    threadPath: {
      type: String,
      default: 'root',
    },
    
    // Blog Reference
    blogId: {
      type: Schema.Types.ObjectId,
      ref: 'Blog',
      required: [true, 'Blog ID is required'],
      index: true,
    },
    blogSlug: {
      type: String,
      required: [true, 'Blog slug is required'],
      trim: true,
      index: true,
    },
    
    // Author (Enhanced)
    author: {
      type: AuthorSchema,
      required: true,
    },
    
    // Content
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    
    // 🆕 Edit Functionality
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: [EditHistorySchema],
    editDeadline: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      },
    },
    
    // 🆕 Media Attachments
    attachments: [MediaAttachmentSchema],
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      default: 'pending',
      index: true,
    },
    
    // 🆕 Enhanced Voting (ObjectId-based)
    likes: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    dislikes: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    helpfulVotes: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    notHelpfulVotes: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    
    // Legacy voting (backward compatibility)
    likedBy: [
      {
        type: String,
      },
    ],
    dislikedBy: [
      {
        type: String,
      },
    ],
    
    // Replies
    replies: [ReplySchema],
    
    // 🆕 Pinning
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pinnedAt: {
      type: Date,
    },
    pinnedReason: {
      type: String,
      maxlength: 200,
    },
    
    // 🆕 Best Answer
    isBestAnswer: {
      type: Boolean,
      default: false,
    },
    markedBestBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    markedBestAt: {
      type: Date,
    },
    
    // 🆕 @Mentions
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    
    // 🆕 Sentiment Analysis
    sentiment: SentimentSchema,
    
    // Reporting
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    reportReasons: [
      {
        type: String,
        trim: true,
      },
    ],
    
    // 🆕 Moderation
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationNotes: {
      type: String,
      maxlength: 500,
    },
    
    // Deletion
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // 🆕 Analytics
    viewCount: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// 🔒 INDEXES (Optimized for Performance)
// ═══════════════════════════════════════════════════════════════

// Existing indexes
CommentSchema.index({ blogId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ blogSlug: 1, status: 1 });
CommentSchema.index({ status: 1, createdAt: -1 });
CommentSchema.index({ isDeleted: 1 });
CommentSchema.index({ 'author.email': 1 });

// 🆕 New indexes for modern features
CommentSchema.index({ isPinned: -1, createdAt: -1 }); // Pinned first
CommentSchema.index({ isBestAnswer: -1 }); // Best answers
CommentSchema.index({ engagementScore: -1 }); // Top comments
CommentSchema.index({ 'author.isVerifiedBuyer': -1, createdAt: -1 }); // Verified buyers first
CommentSchema.index({ threadPath: 1 }); // Threading
CommentSchema.index({ parentCommentId: 1 }); // Nested comments
CommentSchema.index({ mentions: 1 }); // @mentions lookup

// Compound index for sorting options
CommentSchema.index({ 
  blogId: 1, 
  status: 1, 
  isPinned: -1, 
  'author.isVerifiedBuyer': -1, 
  createdAt: -1 
});

// ═══════════════════════════════════════════════════════════════
// 🔒 VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Reply count
CommentSchema.virtual('replyCount').get(function () {
  return this.replies?.length || 0;
});

// Like count (new system)
CommentSchema.virtual('likeCount').get(function () {
  return this.likes?.length || 0;
});

// Dislike count (new system)
CommentSchema.virtual('dislikeCount').get(function () {
  return this.dislikes?.length || 0;
});

// Helpful vote count
CommentSchema.virtual('helpfulCount').get(function () {
  return this.helpfulVotes?.length || 0;
});

// Not helpful vote count
CommentSchema.virtual('notHelpfulCount').get(function () {
  return this.notHelpfulVotes?.length || 0;
});

// Net score (likes - dislikes)
CommentSchema.virtual('netScore').get(function () {
  return (this.likes?.length || 0) - (this.dislikes?.length || 0);
});

// Is editable (within 5 minutes)
CommentSchema.virtual('isEditable').get(function () {
  if (!this.editDeadline) return false;
  return new Date() < this.editDeadline;
});

// ═══════════════════════════════════════════════════════════════
// 🔒 MIDDLEWARE (Hooks)
// ═══════════════════════════════════════════════════════════════

// Calculate engagement score before save
CommentSchema.pre('save', function (next) {
  if (this.isModified('likes') || this.isModified('helpfulVotes') || this.isModified('replies')) {
    this.engagementScore =
      (this.likes?.length || 0) * 1 +
      (this.helpfulVotes?.length || 0) * 2 +
      (this.replies?.length || 0) * 3;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════
// 🔒 METHODS
// ═══════════════════════════════════════════════════════════════

// Method to add helpful vote
CommentSchema.methods.addHelpfulVote = function (userId: mongoose.Types.ObjectId) {
  if (!this.helpfulVotes.includes(userId)) {
    this.helpfulVotes.push(userId);
    // Remove from not helpful if exists
    this.notHelpfulVotes = this.notHelpfulVotes.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(userId)
    );
  }
};

// Method to add not helpful vote
CommentSchema.methods.addNotHelpfulVote = function (userId: mongoose.Types.ObjectId) {
  if (!this.notHelpfulVotes.includes(userId)) {
    this.notHelpfulVotes.push(userId);
    // Remove from helpful if exists
    this.helpfulVotes = this.helpfulVotes.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(userId)
    );
  }
};

// Ensure virtuals are included in JSON
CommentSchema.set('toJSON', { virtuals: true });
CommentSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// 🔒 MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
