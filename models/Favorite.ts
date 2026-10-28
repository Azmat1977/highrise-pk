// models/Favorite.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type FavoriteEntityType = 'property' | 'project' | 'unit';

// ============================================
// INTERFACE
// ============================================

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  
  // 🆕 Generic Entity Support (instead of just propertyId)
  entityType: FavoriteEntityType;
  entityId: Types.ObjectId;
  
  // 🆕 Snapshot for quick display (without populate)
  entitySnapshot?: {
    title: string;
    price?: number;
    city?: string;
    imageUrl?: string;
    slug?: string;
    propertyType?: string;
    projectCategory?: string;
  };
  
  // 🆕 User Notes & Tags
  notes?: string;
  tags?: string[];
  folderName?: string;
  
  // 🆕 Notification Preferences
  notifyOnPriceDrop?: boolean;
  notifyOnAvailability?: boolean;
  notifyOnUpdate?: boolean;
  
  // 🆕 Visit Reminder
  visitScheduled?: Date;
  reminderSent?: boolean;
  
  // 🆕 Analytics
  viewedCount?: number;
  lastViewedAt?: Date;
  addedFrom?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // 🆕 Generic Entity Support
    entityType: {
      type: String,
      enum: ['property', 'project', 'unit'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'entityModel',  // Dynamic reference
    },
    
    // 🆕 Snapshot for quick display
    entitySnapshot: {
      title: { type: String },
      price: { type: Number },
      city: { type: String },
      imageUrl: { type: String },
      slug: { type: String },
      propertyType: { type: String },
      projectCategory: { type: String },
    },
    
    // 🆕 User Notes & Tags
    notes: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    folderName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'General',
    },
    
    // 🆕 Notification Preferences
    notifyOnPriceDrop: {
      type: Boolean,
      default: true,
    },
    notifyOnAvailability: {
      type: Boolean,
      default: false,
    },
    notifyOnUpdate: {
      type: Boolean,
      default: false,
    },
    
    // 🆕 Visit Reminder
    visitScheduled: {
      type: Date,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    
    // 🆕 Analytics
    viewedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastViewedAt: {
      type: Date,
    },
    addedFrom: {
      type: String,  // 'search', 'detail_page', 'compare', 'similar', etc.
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Compound unique index to prevent duplicate favorites
FavoriteSchema.index(
  { userId: 1, entityType: 1, entityId: 1 }, 
  { unique: true }
);

// For fetching user's favorites by type
FavoriteSchema.index({ userId: 1, entityType: 1, createdAt: -1 });

// For fetching user's favorites in a folder
FavoriteSchema.index({ userId: 1, folderName: 1, createdAt: -1 });

// For notification queries
FavoriteSchema.index({ entityId: 1, notifyOnPriceDrop: 1 });
FavoriteSchema.index({ entityId: 1, notifyOnAvailability: 1 });

// For visit reminders
FavoriteSchema.index({ visitScheduled: 1, reminderSent: 1 });

// For analytics
FavoriteSchema.index({ entityId: 1, entityType: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Dynamic model reference for populate
FavoriteSchema.virtual('entityModel').get(function (this: IFavorite) {
  const modelMap: Record<FavoriteEntityType, string> = {
    property: 'Property',
    project: 'Project',
    unit: 'Unit',
  };
  return modelMap[this.entityType];
});

// Populate the actual entity
FavoriteSchema.virtual('entity', {
  refPath: 'entityModel',
  localField: 'entityId',
  foreignField: '_id',
  justOne: true,
});

// ============================================
// STATIC METHODS
// ============================================

FavoriteSchema.statics.addFavorite = async function (
  userId: Types.ObjectId,
  entityType: FavoriteEntityType,
  entityId: Types.ObjectId,
  snapshot?: IFavorite['entitySnapshot'],
  options?: {
    notes?: string;
    tags?: string[];
    folderName?: string;
    addedFrom?: string;
    notifyOnPriceDrop?: boolean;
  }
) {
  return this.findOneAndUpdate(
    { userId, entityType, entityId },
    {
      userId,
      entityType,
      entityId,
      entitySnapshot: snapshot,
      notes: options?.notes,
      tags: options?.tags,
      folderName: options?.folderName || 'General',
      addedFrom: options?.addedFrom,
      notifyOnPriceDrop: options?.notifyOnPriceDrop ?? true,
    },
    { upsert: true, new: true }
  );
};

FavoriteSchema.statics.removeFavorite = async function (
  userId: Types.ObjectId,
  entityType: FavoriteEntityType,
  entityId: Types.ObjectId
) {
  return this.findOneAndDelete({ userId, entityType, entityId });
};

FavoriteSchema.statics.isFavorited = async function (
  userId: Types.ObjectId,
  entityType: FavoriteEntityType,
  entityId: Types.ObjectId
): Promise<boolean> {
  const favorite = await this.findOne({ userId, entityType, entityId });
  return !!favorite;
};

FavoriteSchema.statics.getUserFavorites = async function (
  userId: Types.ObjectId,
  entityType?: FavoriteEntityType,
  options?: { limit?: number; skip?: number; folderName?: string }
) {
  const query: any = { userId };
  
  if (entityType) {
    query.entityType = entityType;
  }
  
  if (options?.folderName) {
    query.folderName = options.folderName;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 20);
};

FavoriteSchema.statics.getFavoriteCount = async function (
  entityType: FavoriteEntityType,
  entityId: Types.ObjectId
): Promise<number> {
  return this.countDocuments({ entityType, entityId });
};

FavoriteSchema.statics.getUserFolders = async function (
  userId: Types.ObjectId
): Promise<string[]> {
  const folders = await this.distinct('folderName', { userId });
  return folders.filter(Boolean);
};

FavoriteSchema.statics.getUsersToNotifyOnPriceDrop = async function (
  entityType: FavoriteEntityType,
  entityId: Types.ObjectId
): Promise<Types.ObjectId[]> {
  const favorites = await this.find({
    entityType,
    entityId,
    notifyOnPriceDrop: true,
  }).select('userId');
  
  return favorites.map((f: IFavorite) => f.userId);
};

// ============================================
// INSTANCE METHODS
// ============================================

FavoriteSchema.methods.incrementViewCount = async function () {
  this.viewedCount = (this.viewedCount || 0) + 1;
  this.lastViewedAt = new Date();
  return this.save();
};

FavoriteSchema.methods.updateSnapshot = async function (
  snapshot: IFavorite['entitySnapshot']
) {
  this.entitySnapshot = { ...this.entitySnapshot, ...snapshot };
  return this.save();
};

FavoriteSchema.methods.scheduleVisit = async function (date: Date) {
  this.visitScheduled = date;
  this.reminderSent = false;
  return this.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

FavoriteSchema.pre('save', function (next) {
  // Ensure folderName has a default
  if (!this.folderName) {
    this.folderName = 'General';
  }
  
  // Trim tags
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.trim()).filter(Boolean);
  }
  
  next();
});

// Ensure virtuals are included in JSON
FavoriteSchema.set('toJSON', { virtuals: true });
FavoriteSchema.set('toObject', { virtuals: true });

// ============================================
// MODEL EXPORT
// ============================================

const Favorite = mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', FavoriteSchema);

export default Favorite;
