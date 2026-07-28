// models/Settings.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  // Site Information
  siteName: string;
  siteTagline: string;
  siteUrl: string;
  siteLogo: string;
  siteFavicon: string;
  
  // Contact Information
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactAddress: string;
  
  // Social Media Links
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialLinkedIn: string;
  socialYouTube: string;
  socialTikTok: string;
  
  // SEO Settings
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  
  // Email Settings (display only - actual config in .env)
  emailHost: string;
  emailPort: string;
  emailFrom: string;
  emailFromName: string;
  
  // Business Settings
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  
  // Feature Toggles
  maintenanceMode: boolean;
  allowRegistration: boolean;
  enableNotifications: boolean;
  enableNewsletter: boolean;
  enableComments: boolean;
  requireEmailVerification: boolean;
  
  // Business Hours
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  
  // Watermark Settings
  watermark: {
    enabled: boolean;
    type: 'text' | 'logo';
    text: string;
    logoUrl: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
    opacity: number;
    size: 'small' | 'medium' | 'large';
    padding: number;
  };
  
  // Timestamps
  updatedAt: Date;
  updatedBy: string;
}

const BusinessHourSchema = new Schema({
  open: { type: String, default: '09:00' },
  close: { type: String, default: '18:00' },
  closed: { type: Boolean, default: false },
}, { _id: false });

const SettingsSchema = new Schema(
  {
    // Site Information
    siteName: { type: String, default: 'Highrise.pk' },
    siteTagline: { type: String, default: 'Pakistan\'s Premier Real Estate Platform' },
    siteUrl: { type: String, default: 'https://highrise.pk' },
    siteLogo: { type: String, default: '' },
    siteFavicon: { type: String, default: '' },
    
    // Contact Information
    contactEmail: { type: String, default: 'info@highrise.pk' },
    contactPhone: { type: String, default: '+92-300-1234567' },
    contactWhatsApp: { type: String, default: '+92-300-1234567' },
    contactAddress: { type: String, default: 'Lahore, Pakistan' },
    
    // Social Media Links
    socialFacebook: { type: String, default: '' },
    socialInstagram: { type: String, default: '' },
    socialTwitter: { type: String, default: '' },
    socialLinkedIn: { type: String, default: '' },
    socialYouTube: { type: String, default: '' },
    socialTikTok: { type: String, default: '' },
    
    // SEO Settings
    seoTitle: { type: String, default: 'Highrise.pk - Real Estate in Pakistan' },
    seoDescription: { type: String, default: 'Find your dream property in Pakistan. Browse homes, apartments, plots, and commercial properties.' },
    seoKeywords: { type: String, default: 'real estate pakistan, property, homes, apartments, plots, lahore, karachi, islamabad' },
    googleAnalyticsId: { type: String, default: '' },
    googleTagManagerId: { type: String, default: '' },
    
    // Email Settings
    emailHost: { type: String, default: 'mail.highrise.pk' },
    emailPort: { type: String, default: '465' },
    emailFrom: { type: String, default: 'info@highrise.pk' },
    emailFromName: { type: String, default: 'Highrise.pk' },
    
    // Business Settings
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs.' },
    timezone: { type: String, default: 'Asia/Karachi' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '12h' },
    
    // Feature Toggles
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    enableNotifications: { type: Boolean, default: true },
    enableNewsletter: { type: Boolean, default: true },
    enableComments: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false },
    
    // Business Hours
    businessHours: {
      monday: { type: BusinessHourSchema, default: () => ({ open: '09:00', close: '18:00', closed: false }) },
      tuesday: { type: BusinessHourSchema, default: () => ({ open: '09:00', close: '18:00', closed: false }) },
      wednesday: { type: BusinessHourSchema, default: () => ({ open: '09:00', close: '18:00', closed: false }) },
      thursday: { type: BusinessHourSchema, default: () => ({ open: '09:00', close: '18:00', closed: false }) },
      friday: { type: BusinessHourSchema, default: () => ({ open: '09:00', close: '18:00', closed: false }) },
      saturday: { type: BusinessHourSchema, default: () => ({ open: '10:00', close: '16:00', closed: false }) },
      sunday: { type: BusinessHourSchema, default: () => ({ open: '10:00', close: '16:00', closed: true }) },
    },
    
    // Watermark Settings
    watermark: {
      enabled: { type: Boolean, default: true },
      type: { type: String, enum: ['text', 'logo'], default: 'text' },
      text: { type: String, default: 'Highrise.pk' },
      logoUrl: { type: String, default: '' },
      position: { 
        type: String, 
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'bottom-center'],
        default: 'bottom-right' 
      },
      opacity: { type: Number, default: 70, min: 10, max: 100 },
      size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      padding: { type: Number, default: 20, min: 0, max: 100 },
    },
    
    // Meta
    updatedBy: { type: String, default: 'admin' },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists (singleton pattern)
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
