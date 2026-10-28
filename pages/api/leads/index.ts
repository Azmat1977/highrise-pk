// pages/api/leads/index.ts
// Generic lead endpoint is intentionally NON-Property for writes.
// Property inquiries/callbacks/site-visits must use
// /api/properties/[id]/communication so recipient assignment is server-owned.

import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Project from '@/models/Projects';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { rateLimitInquiry, rateLimitAgent } from '@/lib/rateLimit';
import { requireAuth } from '@/lib/requireAuth';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ==========================================
  // POST: Create a non-Property lead
  // ==========================================
  if (req.method === 'POST') {
    const rl = await rateLimitInquiry(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      return res.status(429).json({
        success: false,
        message: `Too many inquiries. Please try again in ${rl.retryAfter ?? 60} seconds.`,
      });
    }

    // Property communication has a dedicated authenticated endpoint. Reject
    // before reading any browser-controlled sender/recipient fields.
    if (req.body?.propertyId || req.body?.entityType === 'property') {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(409).json({
        success: false,
        code: 'PROPERTY_COMMUNICATION_ROUTE_REQUIRED',
        message: 'Use the Property communication endpoint for Property inquiries.',
      });
    }

    await dbConnect();

    try {
      const {
        name,
        email,
        phone,
        cnic,
        message,
        projectId,
        unitId,
        developerId,
        leadType = 'project_interest',
        source = 'project_page',
        isSponsored,
        campaignSource,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer,
        landingPage,
        deviceType,
        browser,
        ipAddress,
        pageViewDuration,
        downloadedBrochure,
        viewedFloorPlan,
        watchedVideo,
      } = req.body ?? {};

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and phone are required.',
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'projectId is required for this lead route.',
        });
      }

      if (!developerId) {
        return res.status(400).json({
          success: false,
          message: 'Developer ID is required for project inquiries.',
        });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const normalizedPhone = String(phone).trim();
      const normalizedName = String(name).trim();
      const normalizedMessage = typeof message === 'string' ? message.trim() : '';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      }
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });
      }

      const project: any = await Project.findById(projectId).select(
        'projectName slug projectId city area minPrice maxPrice projectCategory projectNature images gallery developerProfile isFeatured promotionEndDate'
      );
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      // Server-Side Auto-Attribution Fallback
      // Validate campaign authenticity: if user was in organic details flow but campaign is active
      const now = new Date();
      const isCampaignActive = project.isFeatured && (!project.promotionEndDate || new Date(project.promotionEndDate) >= now);
      const computedIsSponsored = Boolean(isSponsored) || isCampaignActive;
      const computedCampaignSource = campaignSource || (isCampaignActive ? 'organic_attributed_lead' : undefined);

      let primaryImage: string | null = null;
      if (project.images?.length) {
        const primary = project.images.find((img: any) => img.isPrimary);
        primaryImage = primary ? primary.url : project.images[0]?.url ?? null;
      } else if (project.gallery?.length) {
        primaryImage = project.gallery[0]?.url ?? null;
      }

      const projectSnapshot = {
        _id: project._id,
        projectCode: project.projectId || undefined,   // HR-PRJ-XXXXX — phone-friendly reference
        projectName: project.projectName,
        slug: project.slug,
        city: project.city,
        area: project.area,
        minPrice: project.minPrice,
        maxPrice: project.maxPrice,
        projectCategory: project.projectCategory,
        projectNature: project.projectNature,
        primaryImage,
      };

      const developer: any = await User.findById(developerId).lean();
      if (!developer) {
        return res.status(404).json({ success: false, message: 'Developer not found.' });
      }

      const developerSnapshot = {
        _id: developer._id,
        companyName: developer.companyName || 'N/A',
        email: developer.email,
        phone: developer.phone || undefined,
        logo: developer.logo || undefined,
        website: developer.website || undefined,
      };

      const lead = await Lead.create({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        cnic,
        message: normalizedMessage,
        leadType,
        entityType: 'project',
        project: projectId,
        projectSnapshot,
        unit: unitId || undefined,
        developer: developerId,
        developerSnapshot,
        source,
        isSponsored: computedIsSponsored,
        campaignSource: computedCampaignSource,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer,
        landingPage,
        deviceType,
        browser,
        ipAddress,
        pageViewDuration,
        downloadedBrochure: downloadedBrochure || false,
        viewedFloorPlan: viewedFloorPlan || false,
        watchedVideo: watchedVideo || false,
        assignedTo: developer.email,
        assignedToRole: 'developer',
        assignedToUserId: developerId,
        status: 'new',
      });

      // Atomically increment organic inquiries AND promotionLeads if tagged
      const incFields: Record<string, number> = { inquiries: 1 };
      if (computedIsSponsored) {
        incFields.promotionLeads = 1;
      }
      await Project.findByIdAndUpdate(projectId, { $inc: incFields });

      try {
        const { enrollRecipient } = await import('@/lib/automation/enrollRecipient');
        enrollRecipient('lead_created', {
          recipientId: String(lead._id),
          recipientType: 'lead',
          email: lead.email,
          name: lead.name,
          city: projectSnapshot.city || '',
          leadStatus: lead.status,
          leadSource: lead.source,
          leadType: lead.leadType,
        }).catch(() => undefined);
      } catch {
        // best-effort: automation enrollment is non-blocking
      }

      try {
        const siteUrl = process.env.NEXTAUTH_URL || 'https://highrise.pk';
        const listingTitle = projectSnapshot.projectName || 'your project';
        const listingUrl = `${siteUrl}/projects/${projectSnapshot.slug || projectId}`;
        const dashboardUrl = `${siteUrl}/developer/leads`;
        const safeName = escapeHtml(normalizedName);
        const safeEmail = escapeHtml(normalizedEmail);
        const safePhone = escapeHtml(normalizedPhone);
        const safeLeadType = escapeHtml(leadType);
        const safeSource = escapeHtml(source);
        const safeMessage = escapeHtml(normalizedMessage);
        const safeTitle = escapeHtml(listingTitle);
        const safeProjectCode = escapeHtml(projectSnapshot.projectCode || '');
        const safeCity = escapeHtml(projectSnapshot.city || '');
        const safeArea = escapeHtml(projectSnapshot.area || '');

        const html = `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#029bba,#027a94);padding:20px 24px;border-radius:12px 12px 0 0;color:white;">
                <h1 style="margin:0;font-size:20px;">New Lead Received</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:.9;">You have a new lead on <strong>${safeTitle}</strong> via Highrise.pk</p>
              </div>
              <div style="background:white;padding:20px 24px;border-radius:0 0 12px 12px;">
                <h2 style="font-size:16px;margin:0 0 10px;">Lead Details</h2>
                <table style="width:100%;font-size:14px;color:#374151;margin-bottom:16px;">
                  <tr><td style="padding:4px 0;width:120px;color:#6b7280;">Name:</td><td style="padding:4px 0;font-weight:bold;">${safeName}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Email:</td><td style="padding:4px 0;">${safeEmail}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Phone:</td><td style="padding:4px 0;">${safePhone}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Type:</td><td style="padding:4px 0;">${safeLeadType}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Source:</td><td style="padding:4px 0;">${safeSource}</td></tr>
                </table>
                ${safeMessage ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 14px;margin-bottom:16px;border:1px solid #e5e7eb;"><strong style="display:block;margin-bottom:4px;font-size:13px;color:#111827;">Message:</strong><p style="margin:0;font-size:13px;color:#4b5563;white-space:pre-line;">${safeMessage}</p></div>` : ''}
                <h2 style="font-size:16px;margin:0 0 10px;">Project Details</h2>
                <table style="width:100%;font-size:14px;color:#374151;margin-bottom:20px;">
                  <tr><td style="padding:4px 0;width:120px;color:#6b7280;">Title:</td><td style="padding:4px 0;font-weight:bold;">${safeTitle}</td></tr>
                  ${safeProjectCode ? `<tr><td style="padding:4px 0;color:#6b7280;">Reference:</td><td style="padding:4px 0;font-family:monospace;font-weight:bold;">${safeProjectCode}</td></tr>` : ''}
                  ${safeCity ? `<tr><td style="padding:4px 0;color:#6b7280;">City:</td><td style="padding:4px 0;">${safeCity}</td></tr>` : ''}
                  ${safeArea ? `<tr><td style="padding:4px 0;color:#6b7280;">Area:</td><td style="padding:4px 0;">${safeArea}</td></tr>` : ''}
                </table>
                <div style="text-align:center;margin-top:10px;">
                  <a href="${dashboardUrl}" style="display:inline-block;margin:0 4px 8px;background:#029bba;color:white;padding:10px 18px;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">View Lead in Dashboard →</a>
                  <a href="${listingUrl}" style="display:inline-block;margin:0 4px;background:#f3f4f6;color:#111827;padding:10px 18px;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">Open Project →</a>
                </div>
              </div>
            </div>
          </body></html>`;

        if (developer.email) {
          await sendEmail({
            to: developer.email,
            subject: `New Lead for ${listingTitle} | Highrise.pk`,
            html,
            fromName: 'Highrise.pk Leads',
          });
        }
      } catch {
        // best-effort: notification email failure must not block the lead
      }

      return res.status(201).json({
        success: true,
        message: 'Your project inquiry has been sent successfully.',
        data: {
          leadId: lead._id,
          leadScore: lead.leadScore,
          priority: lead.priority,
          status: lead.status,
        },
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Server error while submitting lead. Please try again.',
      });
    }
  }

  // ==========================================
  // GET: Fetch Leads (Admin + Developer + Agent)
  // ==========================================
  if (req.method === 'GET') {
    // V6.8.0: Rate limit lead reads (prevents enumeration)
    const rl = await rateLimitAgent(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      return res.status(429).json({
        success: false,
        message: `Too many requests. Retry in ${rl.retryAfter ?? 60} seconds.`,
      });
    }

    await dbConnect();

    try {
      // DB-current auth: suspended/revoked/deleted accounts cannot keep lead access
      // merely because the browser still has an old session cookie.
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const currentEmail = auth.email || '';
      const currentUserId = auth.id;
      const currentRole = String(auth.role || 'user');
      const isVerifiedAgent = currentRole === 'agent' || auth.capabilities.includes('real_estate_agent');
      const isVerifiedOwner = auth.capabilities.includes('property_owner');

      const {
        developerId,
        projectId,
        status,
        priority,
        source,
        leadType,
        search,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
        minScore,
        maxScore,
        isArchived = 'false',
      } = req.query;

      // Archived filter:
      // isArchived = 'true'  -> only archived
      // isArchived = 'false' -> only active (default)
      // isArchived = 'all'   -> no isArchived filter
      const filter: any = {};
      if (isArchived === 'true') {
        filter.isArchived = true;
      } else if (isArchived === 'false') {
        filter.isArchived = false;
      }

      // V6.8.0: Role-based filtering (Session 3 capability flag pattern)
      // Admin: sees everything
      // Agent: role='agent' OR isVerifiedAgent=true (backward compat + new pattern)
      // Developer: role='developer'
      // Owner: isVerifiedOwner=true
      const isAdmin      = currentRole === 'admin';
      const isDeveloper  = currentRole === 'developer';
      const isAgent      = currentRole === 'agent' || isVerifiedAgent;
      const isOwner      = isVerifiedOwner;

      if (isAdmin || auth.authorityRole === 'superadmin') {
        if (developerId) filter['developerSnapshot._id'] = developerId;
      } else if (isDeveloper) {
        // Property leads use exact user-id + role assignment. Non-Property
        // project leads keep their existing developer compatibility paths.
        filter.$or = [
          { entityType: 'property', assignedToUserId: currentUserId, assignedToRole: 'developer' },
          { entityType: { $ne: 'property' }, 'developerSnapshot.email': currentEmail },
          { entityType: { $ne: 'property' }, assignedTo: currentEmail },
          { entityType: { $ne: 'property' }, assignedToUserId: currentUserId },
        ];
      } else if (isAgent) {
        filter.entityType = 'property';
        filter.assignedToUserId = currentUserId;
        filter.assignedToRole = 'agent';
      } else if (isOwner) {
        filter.entityType = 'property';
        filter.assignedToUserId = currentUserId;
        filter.assignedToRole = 'owner';
      } else {
        // Regular user has no lead access
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view leads',
        });
      }

      if (projectId) {
        filter.project = projectId;
      }

      if (status && status !== 'all') {
        filter.status = { $in: (status as string).split(',') };
      }

      if (priority && priority !== 'all') {
        filter.priority = { $in: (priority as string).split(',') };
      }

      if (source && source !== 'all') {
        filter.source = source;
      }

      if (leadType && leadType !== 'all') {
        filter.leadType = leadType;
      }

      if (search) {
        const searchFilter = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } },
            { 'projectSnapshot.projectName': { $regex: search, $options: 'i' } },
            { 'projectSnapshot.projectCode': { $regex: search, $options: 'i' } },
          ],
        };

        // ✅ If a role-based $or filter already exists, wrap both in $and
        // so neither overwrites the other. Without this, searching "Ali"
        // would return leads from ALL developers, not just the current one.
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, searchFilter];
          delete filter.$or;
        } else {
          filter.$or = searchFilter.$or;
        }
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
        if (dateTo) {
          const endDate = new Date(dateTo as string);
          endDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = endDate;
        }
      }

      if (minScore) {
        filter.leadScore = { ...filter.leadScore, $gte: parseInt(minScore as string) };
      }
      if (maxScore) {
        filter.leadScore = { ...filter.leadScore, $lte: parseInt(maxScore as string) };
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [leads, total] = await Promise.all([
        Lead.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .populate('project', 'projectName slug')
          .populate('unit', 'unitNumber floorNumber type')
          .lean(),
        Lead.countDocuments(filter),
      ]);

      const statsFilter = { ...filter };
      delete statsFilter.status;

      const stats = await Lead.aggregate([
        { $match: statsFilter },
        {
          $facet: {
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  avgScore: { $avg: '$leadScore' },
                  totalWon: {
                    $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                  },
                  totalLost: {
                    $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
                  },
                  totalRevenue: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'won'] }, '$conversionValue', 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      const statusCounts: any = {
        all: 0,
        new: 0,
        contacted: 0,
        qualified: 0,
        site_visit_scheduled: 0,
        proposal_sent: 0,
        negotiation: 0,
        won: 0,
        lost: 0,
        nurture: 0,
      };

      if (stats[0]?.byStatus) {
        stats[0].byStatus.forEach((item: any) => {
          statusCounts[item._id] = item.count;
          statusCounts.all += item.count;
        });
      }

      const priorityCounts: any = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      };

      if (stats[0]?.byPriority) {
        stats[0].byPriority.forEach((item: any) => {
          priorityCounts[item._id] = item.count;
        });
      }

      const totals = stats[0]?.totals[0] || {
        total: 0,
        avgScore: 0,
        totalWon: 0,
        totalLost: 0,
        totalRevenue: 0,
      };

      const conversionRate =
        totals.total > 0 ? ((totals.totalWon / totals.total) * 100).toFixed(2) : '0.00';

      return res.status(200).json({
        success: true,
        data: leads,
        stats: {
          ...statusCounts,
          priority: priorityCounts,
          avgScore: Math.round(totals.avgScore || 0),
          conversionRate: parseFloat(conversionRate),
          totalRevenue: totals.totalRevenue || 0,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });

    } catch {
      return res.status(500).json({
        success: false,
        message: 'Server error while fetching leads. Please try again.',
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
