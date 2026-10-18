import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISafeDealCustomer {
  userId?: mongoose.Types.ObjectId | string | null;
  name: string;
  email: string;
  phone: string;
  preferredContactMethod: 'email' | 'phone' | 'whatsapp';
  whatsapp?: string;
}

export interface ISafeDealReference {
  propertyId?: string;
  propertySlug?: string;
  projectId?: string;
  projectSlug?: string;
  agentId?: string;
  agentSlug?: string;
  developerId?: string;
  developerSlug?: string;
  societyId?: string;
  societySlug?: string;
  externalPropertyName?: string;
  externalPropertyAddress?: string;
  externalPropertyCity?: string;
}

export interface ISafeDealFinding {
  category: string;
  check: string;
  status: 'pending' | 'verified' | 'supplied_not_verified' | 'not_applicable' | 'concern';
  evidence?: string;
  notes?: string;
}

export interface ISafeDealAssessment {
  riskLevel?: 'low' | 'medium' | 'high';
  completedAt?: Date;
  summary?: string;
  findings?: ISafeDealFinding[];
  outstandingActions?: string[];
  recommendedNextSteps?: string[];
  dependencies?: string[];
}

export interface ISafeDealDocument {
  title: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface ISafeDealConsultation {
  scheduledAt?: Date;
  mode?: 'video_call' | 'phone_call' | 'in_person';
  durationMinutes?: number;
  meetingLink?: string;
  notes?: string;
  completedAt?: Date;
}

export interface ISafeDealAuditEntry {
  action: string;
  performedAt: Date;
  performedBy?: {
    userId?: string;
    name?: string;
    role?: string;
  };
  note?: string;
  changes?: Record<string, unknown>;
}

export interface ISafeDealNote {
  content: string;
  createdAt: Date;
  createdBy?: {
    userId?: string;
    name?: string;
  };
  isCustomerVisible?: boolean;
}

export interface ISafeDealCase {
  caseNumber: string;
  type: string;
  status: 'submitted' | 'under_review' | 'documents_required' | 'verification_in_progress' | 'consultation_scheduled' | 'assessment_completed' | 'closed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  customer: ISafeDealCustomer;
  reference?: ISafeDealReference;
  description: string;
  questions?: string[];
  proposedInvestment?: {
    amount?: number;
    currency?: string;
    purpose?: string;
  };
  documents?: ISafeDealDocument[];
  assessment?: ISafeDealAssessment;
  consultation?: ISafeDealConsultation;
  assignedTo?: {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    email?: string;
  };
  assignedAt?: Date;
  scopeAcknowledged: boolean;
  scopeAcknowledgedAt: Date;
  internalNotes?: ISafeDealNote[];
  auditTrail?: ISafeDealAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISafeDealCaseDocument extends ISafeDealCase, Document {}

const SafeDealSchema = new Schema<ISafeDealCaseDocument>(
  {
    caseNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'documents_required',
        'verification_in_progress',
        'consultation_scheduled',
        'assessment_completed',
        'closed',
        'cancelled',
      ],
      default: 'submitted',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    source: { type: String, default: 'web_portal' },
    customer: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
      phone: { type: String, required: true },
      preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'whatsapp'],
        default: 'email',
      },
      whatsapp: { type: String },
    },
    reference: {
      propertyId: { type: String },
      propertySlug: { type: String },
      projectId: { type: String },
      projectSlug: { type: String },
      agentId: { type: String },
      agentSlug: { type: String },
      developerId: { type: String },
      developerSlug: { type: String },
      societyId: { type: String },
      societySlug: { type: String },
      externalPropertyName: { type: String },
      externalPropertyAddress: { type: String },
      externalPropertyCity: { type: String },
    },
    description: { type: String, required: true },
    questions: [{ type: String }],
    proposedInvestment: {
      amount: { type: Number },
      currency: { type: String, default: 'PKR' },
      purpose: { type: String },
    },
    documents: [
      {
        title: { type: String, required: true },
        type: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    assessment: {
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
      completedAt: { type: Date },
      summary: { type: String },
      findings: [
        {
          category: { type: String, required: true },
          check: { type: String, required: true },
          status: {
            type: String,
            enum: ['pending', 'verified', 'supplied_not_verified', 'not_applicable', 'concern'],
            default: 'pending',
          },
          evidence: { type: String },
          notes: { type: String },
        },
      ],
      outstandingActions: [{ type: String }],
      recommendedNextSteps: [{ type: String }],
      dependencies: [{ type: String }],
    },
    consultation: {
      scheduledAt: { type: Date },
      mode: { type: String, enum: ['video_call', 'phone_call', 'in_person'] },
      durationMinutes: { type: Number, default: 30 },
      meetingLink: { type: String },
      notes: { type: String },
      completedAt: { type: Date },
    },
    assignedTo: {
      _id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
    },
    assignedAt: { type: Date },
    scopeAcknowledged: { type: Boolean, required: true, default: true },
    scopeAcknowledgedAt: { type: Date, required: true, default: Date.now },
    internalNotes: [
      {
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
          userId: { type: String },
          name: { type: String },
        },
        isCustomerVisible: { type: Boolean, default: false },
      },
    ],
    auditTrail: [
      {
        action: { type: String, required: true },
        performedAt: { type: Date, default: Date.now },
        performedBy: {
          userId: { type: String },
          name: { type: String },
          role: { type: String },
        },
        note: { type: String },
        changes: { type: Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const SafeDealCase: Model<ISafeDealCaseDocument> =
  mongoose.models.SafeDealCase || mongoose.model<ISafeDealCaseDocument>('SafeDealCase', SafeDealSchema);

export default SafeDealCase;