//C:\dev\highrise-pk\models\Comparison.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// COMPARISON MODEL - Highrise.pk
// Stores property comparison lists for users/guests
// ═══════════════════════════════════════════════════════════════

export interface IComparison extends Document {
  _id: Types.ObjectId;
  // User or Session identification
  userId?: Types.ObjectId;
  sessionId?: string; // For guest users

  // ─── LEGACY: Properties being compared ───
  // Kept for backward compatibility with existing property compare system.
  // NEW code should use `items[]` array with entityType support instead.
  properties: Types.ObjectId[];

  // ─── NEW: Multi-entity compare items (V2 — supports property + project) ───
  // Each item carries its own entityType, allowing mixed comparisons.
  items?: Array<{
    entityType: 'property' | 'project';
    entityId:   Types.ObjectId;
    addedAt:    Date;
  }>;

  // Shareable link
  shareId: string;
  isShared: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// Static methods interface
interface IComparisonModel extends Model<IComparison> {
  findOrCreateForUser(userId: Types.ObjectId): Promise<IComparison>;
  findOrCreateForSession(sessionId: string): Promise<IComparison>;
}

const ComparisonSchema = new Schema<IComparison>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true, // Allows null for guest users
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true,
    },
    properties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    // ─── V2 Multi-entity items array ───
    // Supports both properties + projects in one comparison.
    // New /api/compare code writes here. Legacy `properties[]` still populated
    // for backward compatibility during transition period.
    items: [
      {
        entityType: {
          type:    String,
          enum:    ['property', 'project'],
          required: true,
        },
        entityId: {
          type:    Schema.Types.ObjectId,
          required: true,
          refPath: 'items.entityModel',
        },
        entityModel: {
          type: String,
          enum: ['Property', 'Project'],
        },
        addedAt: {
          type:    Date,
          default: Date.now,
        },
      },
    ],
    shareId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(8).toString('hex'),
      index: true,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// For finding user's comparison
ComparisonSchema.index({ userId: 1, createdAt: -1 });
ComparisonSchema.index({ sessionId: 1, createdAt: -1 });

// TTL Index: Auto-delete expired comparisons
ComparisonSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// V2: Fast lookup for items by entityType + entityId
ComparisonSchema.index({ 'items.entityType': 1, 'items.entityId': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

ComparisonSchema.statics.findOrCreateForUser = async function (
  userId: Types.ObjectId
): Promise<IComparison> {
  let comparison = await this.findOne({ userId }).sort({ createdAt: -1 });

  if (!comparison) {
    comparison = await this.create({
      userId,
      properties: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  return comparison;
};

ComparisonSchema.statics.findOrCreateForSession = async function (
  sessionId: string
): Promise<IComparison> {
  let comparison = await this.findOne({ sessionId }).sort({ createdAt: -1 });

  if (!comparison) {
    comparison = await this.create({
      sessionId,
      properties: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for guests
    });
  }

  return comparison;
};

// ═══════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const Comparison: IComparisonModel =
  (mongoose.models.Comparison as IComparisonModel) ||
  mongoose.model<IComparison, IComparisonModel>('Comparison', ComparisonSchema);

export default Comparison;
