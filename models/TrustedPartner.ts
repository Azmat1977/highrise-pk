import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrustedPartner extends Document {
  companyName: string;
  logo: {
    url: string;
    publicId: string;
  };
  website?: string;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface ITrustedPartnerModel extends Model<ITrustedPartner> {
  getActivePartners(): Promise<ITrustedPartner[]>;
  getAllForAdmin(): Promise<ITrustedPartner[]>;
}

const TrustedPartnerSchema: Schema = new Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    logo: {
      url: {
        type: String,
        required: [true, 'Logo URL is required'],
      },
      publicId: {
        type: String,
        required: [true, 'Logo public ID is required'],
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL',
      },
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true, // Controls homepage visibility
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    addedBy: {
      type: String,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for performance
TrustedPartnerSchema.index({ isActive: 1, displayOrder: 1 });
TrustedPartnerSchema.index({ isDeleted: 1 });

// Prevent duplicate company names (case-insensitive)
TrustedPartnerSchema.index({ companyName: 'text' });

// Static method to get active partners for homepage
TrustedPartnerSchema.statics.getActivePartners = async function () {
  return await this.find({
    isActive: true,
    isDeleted: false,
  })
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(12);
};

// Static method to get all (including soft-deleted) for admin
TrustedPartnerSchema.statics.getAllForAdmin = async function () {
  return await this.find({})
    .sort({ displayOrder: 1, createdAt: -1 })
    .select('-__v');
};

const TrustedPartner: ITrustedPartnerModel =
  (mongoose.models.TrustedPartner as ITrustedPartnerModel) ||
  mongoose.model<ITrustedPartner, ITrustedPartnerModel>('TrustedPartner', TrustedPartnerSchema);

export default TrustedPartner;
