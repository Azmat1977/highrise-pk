// ========== FILE: pages/api/leads/quick.ts ==========
// Highrise.pk — 1-Click Lead Submission
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Logic:
//   1. Authenticate user via NextAuth session
//   2. Check if user has phone & isPhoneVerified
//   3. Fetch Property/Project details for snapshot
//   4. Create Lead using Profile data (Pre-filled)
//   5. Return Success → UI shows "Inquiry Sent!"
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth }                          from '@/lib/requireAuth';
import dbConnect                                from '@/lib/dbConnect';
import Lead                                     from '@/models/Lead';
import User                                     from '@/models/User';
import Project                                  from '@/models/Projects';
import Property                                 from '@/models/Property';
import { rateLimitInquiry, sendRateLimitResponse } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Rate limit check ───────────────────────────────────────
  const rl = await rateLimitInquiry(req);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── Auth check ─────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  await dbConnect();

  try {
    const { 
      projectId, 
      propertyId, 
      leadType = 'project_interest',
      message = "Interested in this listing. Please contact me.",
      source = 'direct'
    } = req.body;

    // ── 1. Fetch User Profile for Data ───────────────────────
    const user = await User.findById(auth.id).lean();
    if (!user || !user.phone || !user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Verified phone number required for quick inquiry.',
        code: 'PHONE_NOT_VERIFIED'
      });
    }

    // ── 2. Determine Entity & Developer ──────────────────────
    let projectSnapshot, propertySnapshot, developerId, developerSnapshot;

    if (projectId) {
      const project: any = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      
      projectSnapshot = {
        _id: project._id,
        projectName: project.projectName,
        slug: project.slug,
        city: project.city,
        area: project.area,
        minPrice: project.minPrice,
        maxPrice: project.maxPrice,
        primaryImage: project.images?.[0]?.url || project.gallery?.[0]?.url,
      };
      developerId = project.developerProfile;
    } else if (propertyId) {
      const property: any = await Property.findById(propertyId).lean();
      if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
      
      propertySnapshot = {
        _id: property._id,
        title: property.title,
        slug: property.slug,
        city: property.city,
        society: property.society,
        price: property.price,
        primaryImage: property.images?.[0]?.url,
      };
      developerId = property.owner;
    } else {
      return res.status(400).json({ success: false, message: 'Entity ID required' });
    }

    // ── 3. Get Developer Snapshot ────────────────────────────
    const developer = await User.findById(developerId).select('companyName email phone logo').lean();
    if (developer) {
      developerSnapshot = {
        _id: developer._id,
        companyName: (developer as any).companyName || 'Verified Partner',
        email: developer.email,
        phone: (developer as any).phone,
        logo: (developer as any).logo,
      };
    }

    // ── 4. CREATE THE LEAD ───────────────────────────────────
    const lead = await Lead.create({
      name: user.name,
      email: user.email,
      phone: user.phone,
      leadType,
      entityType: projectId ? 'project' : 'property',
      project: projectId || undefined,
      projectSnapshot,
      property: propertyId || undefined,
      propertySnapshot,
      developer: developerId,
      developerSnapshot,
      source,
      status: 'new',
      assignedTo: developer?.email,
      assignedToRole: projectId ? 'developer' : 'agent',
      assignedToUserId: developerId,
      // Metadata
      notes: `[Quick Inquiry] User was logged in via social auth.`,
      tags: ['social_lead', 'verified_phone'],
    });

    // Increment inquiry counts
    if (projectId) await Project.findByIdAndUpdate(projectId, { $inc: { inquiries: 1 } });
    else if (propertyId) await Property.findByIdAndUpdate(propertyId, { $inc: { inquiries: 1 } });

    return res.status(201).json({
      success: true,
      message: 'Inquiry sent! The partner will contact you soon.',
      leadId: lead._id
    });

  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: 'Server error creating lead' });
  }
}