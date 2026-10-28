// models/PriceHistory.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  propertyId: mongoose.Types.ObjectId;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercent: number;
  changeType: 'increase' | 'decrease';
  changedAt: Date;
  recordedBy?: mongoose.Types.ObjectId;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    oldPrice: {
      type: Number,
      required: true,
    },
    newPrice: {
      type: Number,
      required: true,
    },
    changeAmount: {
      type: Number,
      required: true,
    },
    changePercent: {
      type: Number,
      required: true,
    },
    changeType: {
      type: String,
      enum: ['increase', 'decrease'],
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
PriceHistorySchema.index({ propertyId: 1, changedAt: -1 });
PriceHistorySchema.index({ changeType: 1, changedAt: -1 });

// Static method to get latest price change
PriceHistorySchema.statics.getLatestChange = async function(propertyId: string) {
  return this.findOne({ propertyId })
    .sort({ changedAt: -1 })
    .limit(1);
};

const PriceHistory = mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);

export default PriceHistory;
