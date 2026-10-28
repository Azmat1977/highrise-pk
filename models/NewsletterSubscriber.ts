// models/NewsletterSubscriber.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  normalizedEmail: string; // For duplicate detection (handles gmail +aliases)
  name?: string;
  status: 'pending' | 'active' | 'unsubscribed' | 'bounced';
  source: string;
  
  // Double opt-in fields
  verificationToken?: string;
  verificationTokenExpires?: Date;
  verifiedAt?: Date;
  
  // Unsubscribe fields
  unsubscribeToken: string;
  unsubscribedAt?: Date;
  
  // Tracking
  subscribedAt?: Date;
  lastEmailSentAt?: Date;
  emailsSent: number;
  tags: string[];
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Preferences (for future use)
  preferences?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    topics?: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'unsubscribed', 'bounced'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      default: 'website',
      maxlength: [50, 'Source cannot exceed 50 characters'],
    },
    
    // Double opt-in
    verificationToken: {
      type: String,
      index: true,
      sparse: true,
    },
    verificationTokenExpires: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    
    // Unsubscribe
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    unsubscribedAt: {
      type: Date,
    },
    
    // Tracking
    subscribedAt: {
      type: Date,
    },
    lastEmailSentAt: {
      type: Date,
    },
    emailsSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters'],
    }],
    
    // Metadata
    ipAddress: {
      type: String,
      maxlength: [45, 'IP address invalid'],
    },
    userAgent: {
      type: String,
      maxlength: [500, 'User agent too long'],
    },
    utmSource: {
      type: String,
      maxlength: [100, 'UTM source too long'],
    },
    utmMedium: {
      type: String,
      maxlength: [100, 'UTM medium too long'],
    },
    utmCampaign: {
      type: String,
      maxlength: [100, 'UTM campaign too long'],
    },
    
    // Preferences
    preferences: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
      topics: [{
        type: String,
        trim: true,
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
NewsletterSubscriberSchema.index({ status: 1, createdAt: -1 });
NewsletterSubscriberSchema.index({ verificationToken: 1, verificationTokenExpires: 1 });
NewsletterSubscriberSchema.index({ unsubscribeToken: 1 });

const NewsletterSubscriber = 
  mongoose.models.NewsletterSubscriber || 
  mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);

export default NewsletterSubscriber;
