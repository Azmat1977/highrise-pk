// models/Lead.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type LeadType = 
  | 'project_interest' 
  | 'call_back' 
  | 'site_visit' 
  | 'brochure_download' 
  | 'payment_plan' 
  | 'general_inquiry'
  // 🆕 Property-specific types
  | 'property_inquiry'
  | 'property_viewing'
  | 'make_offer'
  | 'rent_inquiry';

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'site_visit_scheduled' 
  | 'proposal_sent' 
  | 'negotiation' 
  | 'won' 
  | 'lost' 
  | 'nurture';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type LeadSource = 
  | 'project_page' 
  | 'property_page'
  | 'listing_page' 
  | 'search_results' 
  | 'developer_profile'
  | 'agent_profile'      // 🆕
  | 'direct' 
  | 'referral'
  | 'whatsapp'           // 🆕
  | 'call';              // 🆕

export type AssignedToRole = 'admin' | 'developer' | 'sales_team' | 'agent' | 'owner';  // 🆕 Added agent

// 🆕 Entity Type for filtering
export type LeadEntityType = 'project' | 'property' | 'unit';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IDeveloperSnapshot {
  _id: Types.ObjectId;
  companyName: string;
  email: string;
  phone?: string;
  logo?: string;
  website?: string;
}

export interface IProjectSnapshot {
  _id: Types.ObjectId;
  projectName: string;
  slug?: string;
  city: string;
  area: string;
  minPrice?: number;
  maxPrice?: number;
  projectCategory?: string;
  projectNature?: string;
  primaryImage?: string;
}

// 🆕 Property Snapshot for property leads
export interface IPropertySnapshot {
  _id: Types.ObjectId;
  title: string;
  slug?: string;
  city: string;
  society?: string;
  price: number;
  propertyType?: string;
  listingType?: string;
  primaryImage?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

export interface ITimelineEntry {
  action: string;
  performedBy: string;
  performedByRole: 'admin' | 'developer' | 'agent' | 'system';
  timestamp: Date;
  notes?: string;
  statusBefore?: LeadStatus;
  statusAfter?: LeadStatus;
  metadata?: any;
}

// 🆕 Budget Info
export interface IBudgetInfo {
  min?: number;
  max?: number;
  tier?: 'under_50L' | '50L_1Cr' | '1Cr_3Cr' | '3Cr_5Cr' | 'above_5Cr'; // Aria budget tiers
  paymentPreference?: 'cash' | 'installment' | 'both';
  downPaymentReady?: number;
  financingRequired?: boolean;
}

// 🆕 Communication Log
export interface ICommunication {
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'meeting';
  direction: 'inbound' | 'outbound';
  duration?: number;          // For calls (seconds)
  content?: string;           // Message/notes
  performedBy: string;
  timestamp: Date;
  outcome?: 'successful' | 'no_answer' | 'voicemail' | 'failed';
}

// ============================================
// MAIN LEAD INTERFACE
// ============================================

export interface ILead extends Document {
  // ===================================
  // CUSTOMER INFORMATION
  // ===================================
  name: string;
  email: string;
  phone: string;
  cnic?: string;

  // ===================================
  // LEAD CLASSIFICATION
  // ===================================
  leadType: LeadType;
  message?: string;

  // 🆕 Entity Type (for filtering)
  entityType: LeadEntityType;

  // ===================================
  // ARIA AI CONVERSATION LINK
  // ===================================
  conversationId?: Types.ObjectId;  // links to Conversation model
  sessionId?: string;               // Aria chat session UUID

  // ===================================
  // PROJECT & DEVELOPER LINKS
  // ===================================
  project?: Types.ObjectId;  // 🆕 Made optional
  projectSnapshot?: IProjectSnapshot;

  unit?: Types.ObjectId;

  developer?: Types.ObjectId;  // 🆕 Made optional
  developerSnapshot?: IDeveloperSnapshot;

  // 🆕 PROPERTY LINKS (for standalone properties)
  property?: Types.ObjectId;
  propertySnapshot?: IPropertySnapshot;

  // ===================================
  // LEAD QUALITY METRICS
  // ===================================
  leadScore: number; // 0-100 (Auto-calculated)
  priority: LeadPriority;

  // 🆕 Lead Temperature
  temperature?: 'cold' | 'warm' | 'hot' | 'burning';

  // ===================================
  // SALES PIPELINE
  // ===================================
  status: LeadStatus;

  // ===================================
  // SOURCE TRACKING (Marketing Analytics)
  // ===================================
  source: LeadSource;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  ipAddress?: string;

  // ===================================
  // ASSIGNMENT & FOLLOW-UP
  // ===================================
  assignedTo?: string; // Email of sales person
  assignedToUserId?: Types.ObjectId;  // 🆕 User reference
  assignedToRole: AssignedToRole;
  scheduledVisit?: Date;
  followUpDate?: Date;
  lastContactedAt?: Date;
  nextActionRequired?: string;

  // 🆕 Lead Open/View Tracking (for accurate "Ignored Leads")
  openedAt?: Date;                // first time opened in panel
  openedBy?: string;              // email of opener
  openedByRole?: 'admin' | 'developer' | 'agent' | 'owner' | 'system';
  lastViewedAt?: Date;            // last time viewed
  lastViewedBy?: string;          // email
  viewCount?: number;             // total opens/views

  // 🆕 Response Time Tracking
  firstResponseTime?: number;      // Minutes until first contact
  averageResponseTime?: number;
  lastResponseAt?: Date;
  responseCount?: number;

  // ===================================
  // CONVERSION TRACKING
  // ===================================
  conversionValue?: number; // PKR amount if won
  wonDate?: Date;
  lostReason?: string;
  lostDate?: Date;

  // ===================================
  // 🆕 BUDGET INFO
  // ===================================
  budget?: IBudgetInfo;

  // ===================================
  // 🆕 COMMUNICATION LOG
  // ===================================
  communications?: ICommunication[];

  // ===================================
  // TIMELINE & AUDIT TRAIL
  // ===================================
  timeline: ITimelineEntry[];

  // ===================================
  // ADMIN MANAGEMENT
  // ===================================
  notes?: string;
  tags?: string[];
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: string;

  // ===================================
  // 🆕 PHASE 2 — EMAIL MARKETING PREFERENCES
  // ===================================
  emailOptOut?: boolean;              // Opted out of marketing emails
  emailOptOutAt?: Date | null;        // When they unsubscribed
  emailUnsubscribeToken?: string;     // Unique token for one-click unsubscribe

  // ===================================
  // ENGAGEMENT METRICS
  // ===================================
  pageViewDuration?: number; // Seconds spent on project page
  numberOfVisits?: number; // How many times they visited the project
  downloadedBrochure?: boolean;
  viewedFloorPlan?: boolean;
  watchedVideo?: boolean;

  // 🆕 Additional Engagement
  viewedPaymentPlan?: boolean;
  usedMortgageCalculator?: boolean;
  comparedProperties?: number;
  savedToFavorites?: boolean;

  // ===================================
  // TIMESTAMPS
  // ===================================
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const DeveloperSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    logo: { type: String },
    website: { type: String },
  },
  { _id: false }
);

const ProjectSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    projectName: { type: String, required: true },
    slug: { type: String },
    city: { type: String, required: true },
    area: { type: String, required: true },
    minPrice: { type: Number },
    maxPrice: { type: Number },
    projectCategory: { type: String },
    projectNature: { type: String },
    primaryImage: { type: String },
  },
  { _id: false }
);

// 🆕 Property Snapshot Schema
const PropertySnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    slug: { type: String },
    city: { type: String },
    society: { type: String },
    locality: { type: String },
    price: { type: Number },
    propertyType: { type: String },
    listingType: { type: String },
    primaryImage: { type: String },
    ownerName: { type: String },
    ownerEmail: { type: String },
    ownerPhone: { type: String },
  },
  { _id: false }
);

const TimelineEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    performedByRole: {
      type: String,
      enum: ['admin', 'developer', 'agent', 'system'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
    statusBefore: { type: String },
    statusAfter: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// 🆕 Budget Info Schema
const BudgetInfoSchema = new Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    tier: {
      type: String,
      enum: ['under_50L', '50L_1Cr', '1Cr_3Cr', '3Cr_5Cr', 'above_5Cr'],
    },
    paymentPreference: { type: String, enum: ['cash', 'installment', 'both'] },
    downPaymentReady: { type: Number, min: 0 },
    financingRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

// 🆕 Communication Schema
const CommunicationSchema = new Schema(
  {
    type: { 
      type: String, 
      enum: ['call', 'email', 'sms', 'whatsapp', 'meeting'],
      required: true 
    },
    direction: { 
      type: String, 
      enum: ['inbound', 'outbound'],
      required: true 
    },
    duration: { type: Number, min: 0 },
    content: { type: String, maxlength: 2000 },
    performedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    outcome: { 
      type: String, 
      enum: ['successful', 'no_answer', 'voicemail', 'failed'] 
    },
  },
  { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const LeadSchema = new Schema<ILead>(
  {
    // CUSTOMER INFORMATION
    name: { 
      type: String, 
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: { 
      type: String, 
      required: true,
      trim: true
    },
    cnic: { type: String },

    // LEAD CLASSIFICATION
    leadType: {
      type: String,
      enum: [
        'project_interest', 
        'call_back', 
        'site_visit', 
        'brochure_download', 
        'payment_plan', 
        'general_inquiry',
        'property_inquiry',
        'property_viewing',
        'make_offer',
        'rent_inquiry'
      ],
      default: 'project_interest',
      required: true,
    },
    message: { 
      type: String,
      maxlength: 2000
    },

    // 🆕 Entity Type
    entityType: {
      type: String,
      enum: ['project', 'property', 'unit'],
      required: true,
      index: true,
    },

    // PROJECT & DEVELOPER LINKS (Now optional)
    project: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project',
      index: true
    },
    projectSnapshot: { 
      type: ProjectSnapshotSchema
    },

    unit: { 
      type: Schema.Types.ObjectId, 
      ref: 'Unit' 
    },

    // Aria AI conversation link
    conversationId: {
      type:  Schema.Types.ObjectId,
      ref:   'Conversation',
      index: true,
    },
    sessionId: {
      type:     String,
      index:    true,
      maxlength: 36, // UUID length
    },

    developer: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      index: true
    },
    developerSnapshot: { 
      type: DeveloperSnapshotSchema
    },

    // 🆕 PROPERTY LINKS
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },
    propertySnapshot: {
      type: PropertySnapshotSchema,
    },

    // LEAD QUALITY METRICS
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },

    // 🆕 Lead Temperature
    temperature: {
      type: String,
      enum: ['cold', 'warm', 'hot', 'burning'],
      default: 'warm',
    },

    // SALES PIPELINE
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'site_visit_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost', 'nurture'],
      default: 'new',
      index: true,
    },

    // SOURCE TRACKING
    source: {
      type: String,
      enum: ['project_page', 'property_page', 'listing_page', 'search_results', 'developer_profile', 'agent_profile', 'direct', 'referral', 'whatsapp', 'call'],
      default: 'project_page',
    },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    utmContent: { type: String },
    utmTerm: { type: String },
    referrer: { type: String },
    landingPage: { type: String },
    deviceType: { 
      type: String, 
      enum: ['mobile', 'tablet', 'desktop'] 
    },
    browser: { type: String },
    ipAddress: { type: String },

    // ASSIGNMENT & FOLLOW-UP
    assignedTo: { type: String },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToRole: {
      type: String,
      enum: ['admin', 'developer', 'sales_team', 'agent', 'owner'],
      default: 'developer',
    },
    scheduledVisit: { type: Date },
    followUpDate: { type: Date, index: true },
    lastContactedAt: { type: Date },
    nextActionRequired: { type: String },

    // 🆕 Lead Open/View Tracking (for accurate "Ignored Leads")
    openedAt: { type: Date, default: null, index: true },
    openedBy: { type: String, lowercase: true, trim: true, default: "" },
    openedByRole: {
      type: String,
      enum: ["admin", "developer", "agent", "owner", "system"],
      default: "system",
    },
    lastViewedAt: { type: Date, default: null, index: true },
    lastViewedBy: { type: String, lowercase: true, trim: true, default: "" },
    viewCount: { type: Number, default: 0, min: 0 },

    // 🆕 Response Time Tracking
    firstResponseTime: { type: Number, min: 0 },
    averageResponseTime: { type: Number, min: 0 },
    lastResponseAt: { type: Date },
    responseCount: { type: Number, default: 0, min: 0 },

    // CONVERSION TRACKING
    conversionValue: { type: Number, min: 0 },
    wonDate: { type: Date },
    lostReason: { type: String },
    lostDate: { type: Date },

    // 🆕 BUDGET INFO
    budget: BudgetInfoSchema,

    // 🆕 COMMUNICATION LOG
    communications: [CommunicationSchema],

    // TIMELINE
    timeline: {
      type: [TimelineEntrySchema],
      default: [],
    },

    // ADMIN MANAGEMENT
    notes: { type: String, maxlength: 5000 },
    tags: [{ type: String }],
    isArchived: { 
      type: Boolean, 
      default: false,
      index: true
    },
    archivedAt: { type: Date },
    archivedBy: { type: String },

    // 🆕 PHASE 2 — EMAIL MARKETING PREFERENCES
    emailOptOut: {
      type: Boolean,
      default: false,
      index: true,   // Fast filter on send: { emailOptOut: false }
    },
    emailOptOutAt: {
      type: Date,
      default: null,
    },
    emailUnsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,   // Allows null (not all leads need token yet)
      index: true,
    },

    // ENGAGEMENT METRICS
    pageViewDuration: { type: Number, min: 0 },
    numberOfVisits: { type: Number, min: 1, default: 1 },
    downloadedBrochure: { type: Boolean, default: false },
    viewedFloorPlan: { type: Boolean, default: false },
    watchedVideo: { type: Boolean, default: false },

    // 🆕 Additional Engagement
    viewedPaymentPlan: { type: Boolean, default: false },
    usedMortgageCalculator: { type: Boolean, default: false },
    comparedProperties: { type: Number, default: 0 },
    savedToFavorites: { type: Boolean, default: false },
  },
  { 
    timestamps: true 
  }
);

// ============================================
// INDEXES
// ============================================

LeadSchema.index({ developer: 1, status: 1 });
LeadSchema.index({ 'developerSnapshot._id': 1, status: 1 });
LeadSchema.index({ project: 1, status: 1 });
LeadSchema.index({ property: 1, status: 1 });  // 🆕
LeadSchema.index({ entityType: 1, status: 1 }); // 🆕
LeadSchema.index({ leadScore: -1 }); // Sort by quality
LeadSchema.index({ priority: 1, createdAt: -1 });
LeadSchema.index({ isArchived: 1, status: 1 });
LeadSchema.index({ email: 1, phone: 1 }); // Duplicate check
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ followUpDate: 1 }); // For reminders
LeadSchema.index({ wonDate: 1 });
LeadSchema.index({ lostDate: 1 });
LeadSchema.index({ assignedTo: 1, status: 1 });
LeadSchema.index({ assignedToUserId: 1, status: 1 });
LeadSchema.index({ entityType: 1, assignedToUserId: 1, assignedToRole: 1, isArchived: 1, createdAt: -1 }); // 🆕
LeadSchema.index({ temperature: 1, status: 1 }); // 🆕

// 🆕 Open/View Tracking indexes
LeadSchema.index({ openedAt: 1, status: 1, isArchived: 1 });
LeadSchema.index({ lastViewedAt: -1 });
LeadSchema.index({ openedBy: 1, openedAt: -1 });

// Aria AI conversation indexes
LeadSchema.index({ conversationId: 1 });
LeadSchema.index({ sessionId: 1, createdAt: -1 });


// Text search index
LeadSchema.index({
  name: 'text',
  email: 'text',
  phone: 'text',
  message: 'text',
});

// ============================================
// METHODS
// ============================================

// Calculate Lead Score
LeadSchema.methods.calculateLeadScore = function(): number {
  let score = 0;

  // 1. Lead Type Priority (30 points)
  const typeScores: Record<LeadType, number> = {
    'site_visit': 30,
    'property_viewing': 30,
    'make_offer': 30,
    'call_back': 25,
    'payment_plan': 25,
    'project_interest': 20,
    'property_inquiry': 20,
    'rent_inquiry': 18,
    'brochure_download': 15,
    'general_inquiry': 10,
  };
  score += typeScores[this.leadType as LeadType] || 10;

  // 2. Contact Info Completeness (20 points)
  if (this.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) score += 10;
  if (this.phone && this.phone.length >= 10) score += 10;

  // 3. Price Range (20 points)
  const entityPrice = this.projectSnapshot?.minPrice || this.propertySnapshot?.price || 0;
  if (entityPrice >= 50000000) score += 20;      // 5 Crore+
  else if (entityPrice >= 20000000) score += 15; // 2-5 Crore
  else if (entityPrice >= 10000000) score += 10; // 1-2 Crore
  else if (entityPrice > 0) score += 5;

  // 4. Message Quality (15 points)
  if (this.message) {
    if (this.message.length > 100) score += 15;
    else if (this.message.length > 50) score += 10;
    else if (this.message.length > 20) score += 5;
  }

  // 5. Source Quality (15 points)
  const sourceScores: Record<LeadSource, number> = {
    'project_page': 15,
    'property_page': 15,
    'developer_profile': 12,
    'agent_profile': 12,
    'search_results': 10,
    'listing_page': 8,
    'referral': 10,
    'whatsapp': 8,
    'call': 10,
    'direct': 5,
  };
  score += sourceScores[this.source as LeadSource] || 5;

  // 6. Engagement Bonus (up to 15 points)
  if (this.downloadedBrochure) score += 3;
  if (this.viewedFloorPlan) score += 3;
  if (this.watchedVideo) score += 4;
  if (this.viewedPaymentPlan) score += 3;
  if (this.savedToFavorites) score += 2;

  return Math.min(score, 100); // Cap at 100
};

// Auto-assign priority based on score
LeadSchema.methods.autoPriority = function(): LeadPriority {
  const score = this.leadScore;
  if (score >= 80) return 'urgent';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// 🆕 Auto-assign temperature based on score and activity
LeadSchema.methods.autoTemperature = function(): 'cold' | 'warm' | 'hot' | 'burning' {
  const score = this.leadScore;
  const hasRecentActivity = this.lastContactedAt && 
    (Date.now() - this.lastContactedAt.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days

  if (score >= 80 && hasRecentActivity) return 'burning';
  if (score >= 60) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
};

// Add timeline entry
LeadSchema.methods.addTimelineEntry = function(
  action: string,
  performedBy: string,
  performedByRole: 'admin' | 'developer' | 'agent' | 'system',
  notes?: string,
  metadata?: any
) {
  this.timeline.push({
    action,
    performedBy,
    performedByRole,
    timestamp: new Date(),
    notes,
    metadata,
  });
};

// 🆕 Add communication entry
LeadSchema.methods.addCommunication = function(
  type: ICommunication['type'],
  direction: ICommunication['direction'],
  performedBy: string,
  content?: string,
  outcome?: ICommunication['outcome'],
  duration?: number
) {
  if (!this.communications) this.communications = [];
  
  this.communications.push({
    type,
    direction,
    performedBy,
    content,
    outcome,
    duration,
    timestamp: new Date(),
  });

  // Update response tracking
  if (direction === 'outbound') {
    this.responseCount = (this.responseCount || 0) + 1;
    this.lastResponseAt = new Date();
    
    if (!this.firstResponseTime && this.createdAt) {
      this.firstResponseTime = Math.round((Date.now() - this.createdAt.getTime()) / 60000);
    }
  }
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

LeadSchema.pre<ILead>('save', function(next) {
  // Validate: Either project or property must exist
  if (!this.project && !this.property) {
    // Allow for general inquiry without entity
    if (this.leadType !== 'general_inquiry') {
      // For non-general inquiries, at least warn (not block for flexibility)
      console.warn('Lead created without project or property reference');
    }
  }

  // Auto-set entityType
  if (!this.entityType) {
    if (this.unit) {
      this.entityType = 'unit';
    } else if (this.project) {
      this.entityType = 'project';
    } else if (this.property) {
      this.entityType = 'property';
    } else {
      this.entityType = 'project'; // Default fallback
    }
  }

  // Calculate lead score if not set or if key fields changed
  if (this.isNew || this.isModified('leadType') || this.isModified('message') || this.isModified('projectSnapshot') || this.isModified('propertySnapshot')) {
    this.leadScore = (this as any).calculateLeadScore();
  }

  // Auto-assign priority based on score
  if (this.isNew || this.isModified('leadScore')) {
    this.priority = (this as any).autoPriority();
  }

  // Auto-assign temperature
  if (this.isNew || this.isModified('leadScore') || this.isModified('lastContactedAt')) {
    this.temperature = (this as any).autoTemperature();
  }

  // Add "Lead Created" timeline entry for new leads
  if (this.isNew) {
    this.timeline.push({
      action: 'Lead Created',
      performedBy: 'System',
      performedByRole: 'system',
      timestamp: new Date(),
      statusAfter: this.status,
      metadata: {
        source: this.source,
        leadType: this.leadType,
        leadScore: this.leadScore,
        entityType: this.entityType,
      },
    });

    // 🆕 PHASE 2 — Auto-generate unsubscribe token for new leads
    // Uses crypto-secure random bytes (32 bytes = 256 bits)
    if (!this.emailUnsubscribeToken) {
      const crypto = require('crypto');
      this.emailUnsubscribeToken = crypto.randomBytes(32).toString('hex');
    }
  }

  // Track status changes
  if (this.isModified('status') && !this.isNew) {
    const oldStatus = (this as any).get('status', null, { getters: false });
    this.timeline.push({
      action: 'Status Changed',
      performedBy: 'System', // Will be updated by API
      performedByRole: 'system',
      timestamp: new Date(),
      statusBefore: oldStatus as LeadStatus,
      statusAfter: this.status,
    });

    // Update conversion dates
    if (this.status === 'won' && !this.wonDate) {
      this.wonDate = new Date();
    }
    if (this.status === 'lost' && !this.lostDate) {
      this.lostDate = new Date();
    }
  }

  next();
});

// ============================================
// VIRTUAL FIELDS
// ============================================

LeadSchema.virtual('isHot').get(function(this: ILead) {
  return this.leadScore >= 70;
});

LeadSchema.virtual('isActive').get(function(this: ILead) {
  return !['won', 'lost', 'nurture'].includes(this.status) && !this.isArchived;
});

LeadSchema.virtual('daysSinceCreated').get(function(this: ILead) {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

LeadSchema.virtual('daysUntilFollowUp').get(function(this: ILead) {
  if (!this.followUpDate) return null;
  return Math.floor((this.followUpDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
});

// 🆕 Entity Name (project or property)
LeadSchema.virtual('entityName').get(function(this: ILead) {
  if (this.projectSnapshot?.projectName) return this.projectSnapshot.projectName;
  if (this.propertySnapshot?.title) return this.propertySnapshot.title;
  return 'Unknown';
});

// 🆕 Total communications count
LeadSchema.virtual('communicationsCount').get(function(this: ILead) {
  return this.communications?.length || 0;
});

// Ensure virtuals are included in JSON output
LeadSchema.set('toJSON', { virtuals: true });
LeadSchema.set('toObject', { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

LeadSchema.statics.getStats = async function(filter: any = {}) {
  const stats = await this.aggregate([
    { $match: { isArchived: false, ...filter } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        bySource: [
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ],
        byEntityType: [
          { $group: { _id: '$entityType', count: { $sum: 1 } } }
        ],
        byTemperature: [
          { $group: { _id: '$temperature', count: { $sum: 1 } } }
        ],
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              avgScore: { $avg: '$leadScore' },
              totalWon: {
                $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
              },
              totalRevenue: {
                $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$conversionValue', 0] }
              },
            }
          }
        ]
      }
    }
  ]);

  return stats[0];
};

// 🆕 Find duplicate leads
LeadSchema.statics.findDuplicates = async function(email: string, phone: string, entityId?: Types.ObjectId) {
  const query: any = {
    $or: [
      { email: email.toLowerCase() },
      { phone: phone }
    ],
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  };

  if (entityId) {
    query.$or.push({ project: entityId }, { property: entityId });
  }

  return this.find(query);
};

// ============================================
// MODEL EXPORT
// ============================================

const Lead = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
