import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IApiKey extends Document {
  name: string;
  key: string;
  hashedKey: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  usageCount: number;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    hashedKey: {
      type: String,
      required: true,
    },
    permissions: [{
      type: String,
      enum: ['blog:create', 'blog:update', 'blog:delete', 'blog:read'],
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to generate API key
ApiKeySchema.statics.generateKey = function () {
  const prefix = 'hrpk_'; // highrise.pk prefix
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
};

// Static method to hash key for storage
ApiKeySchema.statics.hashKey = function (key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
