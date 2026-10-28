import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  folder: string;
  alt: string;
  caption: string;
  uploadedBy?: mongoose.Types.ObjectId;  // Made optional
  usedIn: {
    type: 'blog' | 'property' | 'project' | 'developer' | 'other';
    refId?: mongoose.Types.ObjectId;
  }[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original name is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    format: {
      type: String,
      required: true,
      lowercase: true,
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public_id is required'],
      unique: true,
    },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      default: 'image',
    },
    folder: {
      type: String,
      enum: ['blog', 'blogs', 'properties', 'projects', 'developers', 'general', 'users', 'settings'],
      default: 'general',
    },
    alt: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters'],
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,  // ✅ Changed from true to false
      default: null,
    },
    usedIn: [{
      type: {
        type: String,
        enum: ['blog', 'property', 'project', 'developer', 'other'],
      },
      refId: {
        type: Schema.Types.ObjectId,
      },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ resourceType: 1 });
MediaSchema.index({ isDeleted: 1 });
MediaSchema.index({ publicId: 1 });
MediaSchema.index({ uploadedBy: 1 });

// Virtual for formatted file size
MediaSchema.virtual('formattedSize').get(function () {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtuals are included in JSON
MediaSchema.set('toJSON', { virtuals: true });
MediaSchema.set('toObject', { virtuals: true });

const Media: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;
