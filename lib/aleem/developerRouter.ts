// lib/aleem/developerRouter.ts
// 🏢 DEVELOPER PROJECT LEAD ROUTING ENGINE - HIGHRISE.PK
// Routes project-specific inquiries directly to verified Project Developers/Builders.

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Lead from '@/models/Lead';
import { notifyDeveloperNewLead } from '@/lib/email';
import mongoose from 'mongoose';

export interface RouteProjectLeadOptions {
  leadId: string;
  projectId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  intent?: string;
  message?: string;
}

export interface DeveloperRoutingResult {
  routed: boolean;
  developerId?: string;
  developerName?: string;
  developerEmail?: string;
  projectName?: string;
  projectSlug?: string;
}

/** Lean projection shape for the project query */
interface LeanProject {
  _id: mongoose.Types.ObjectId;
  projectName: string;
  slug: string;
  developerId: mongoose.Types.ObjectId;
  status: string;
  verificationStatus: string;
  developerApprovalStatus: string;
  isVerified: boolean;
  isDeleted: boolean;
  developerProfile?: {
    name?: string;
    officialEmail?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    logoUrl?: string;
    website?: string;
  };
  contactDetails?: {
    email?: string;
    whatsappNumber?: string;
    primaryPhone?: string;
  };
}

/**
 * Routes a project inquiry lead to the verified project developer.
 * Only routes if:
 *   - Project is verified (status === 'verified')
 *   - Developer is approved (developerApprovalStatus === 'approved')
 *   - Developer contact info exists
 */
export async function routeLeadToProjectDeveloper(
  options: RouteProjectLeadOptions,
): Promise<DeveloperRoutingResult> {
  try {
    const {
      leadId,
      projectId,
      customerName,
      customerPhone,
      customerEmail,
      intent,
      message,
    } = options;

    if (!leadId || !projectId) {
      return { routed: false };
    }

    await dbConnect();

    // Fetch project with developer details
    const project = await Project.findById(projectId)
      .select(
        'projectName slug developerId status verificationStatus developerApprovalStatus developerProfile contactDetails isVerified isDeleted'
      )
      .lean<LeanProject | null>();

    if (!project || project.isDeleted) {
      return { routed: false };
    }

    // Strict gating: only route for live, verified projects with approved developers
    if (
      project.status !== 'verified' ||
      project.verificationStatus !== 'verified' ||
      project.developerApprovalStatus !== 'approved' ||
      !project.isVerified
    ) {
      return { routed: false };
    }

    if (!project.developerId) {
      return { routed: false };
    }

    // Determine best contact email for developer
    const devProfile = project.developerProfile || {};
    const projContact = project.contactDetails || {};

    const developerEmail =
      devProfile.officialEmail ||
      projContact.email;

    const developerName = devProfile.name || 'Project Developer';
    const whatsappNumber = devProfile.whatsappNumber || projContact.whatsappNumber || projContact.primaryPhone;

    if (!developerEmail) {
      return { routed: false };
    }

    // Update Lead with developer assignment
    const devObjectId = new mongoose.Types.ObjectId(String(project.developerId));
    const routingNote = `[Auto-Router] Project inquiry routed to developer ${developerName} (${developerEmail}) for project "${project.projectName}".`;

    await Lead.findByIdAndUpdate(leadId, {
      $set: {
        developer: devObjectId,
        developerSnapshot: {
          _id: devObjectId,
          companyName: developerName,
          email: developerEmail,
          phone: whatsappNumber,
          logo: devProfile.logoUrl,
          website: devProfile.website,
        },
        assignedTo: developerEmail,
        assignedToUserId: devObjectId,
        assignedToRole: 'developer',
      },
      $push: {
        timeline: {
          action: 'Lead Assigned to Project Developer',
          performedBy: 'ALEEM Project Router',
          performedByRole: 'system',
          timestamp: new Date(),
          notes: routingNote,
          metadata: {
            projectId: project._id,
            projectName: project.projectName,
            projectSlug: project.slug,
            developerId: project.developerId,
          },
        },
      },
    });

    // Fire notification email to developer
    void notifyDeveloperNewLead(
      {
        name: developerName,
        email: developerEmail,
        whatsappNumber,
        projectName: project.projectName,
        projectSlug: project.slug || '',
      },
      {
        customerName,
        customerPhone,
        customerEmail,
        intent,
        message,
        leadId,
      },
    ).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[notifyDeveloperNewLead failed]:', err);
      }
    });

    return {
      routed: true,
      developerId: String(project.developerId),
      developerName,
      developerEmail,
      projectName: project.projectName,
      projectSlug: project.slug,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[routeLeadToProjectDeveloper error]:', error);
    }
    return { routed: false };
  }
}