// pages/api/leads/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Project from '@/models/Projects';
import User from '@/models/User';
import Property from '@/models/Property';
import { sendEmail } from '@/lib/email';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { rateLimitInquiry, rateLimitAgent } from '@/lib/rateLimit';

// Auth will be added later - using simple role check for now

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ==========================================
  // POST: Create a new Lead (Public + Logged In Users)
  // ==========================================
  if (req.method === 'POST') {
    // V6.8.0: Rate limit lead creation (prevents spam)
    // 10 inquiries per hour per IP
    const rl = await rateLimitInquiry(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
      return res.status(429).json({
        success: false,
        message: `Too many inquiries. Please try again in ${rl.retryAfter ?? 60} seconds.`,
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
        propertyId,
        unitId,
        developerId,
        leadType = 'project_interest',
        source = 'project_page',
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
      } = req.body;

      // VALIDATION
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and phone are required.',
        });
      }

      if (!projectId && !propertyId) {
        return res.status(400).json({
          success: false,
          message: 'Either projectId or propertyId is required.',
        });
      }

      let finalDeveloperId = developerId;
      if (!finalDeveloperId && !projectId && propertyId) {
        finalDeveloperId = null;
      } else if (!finalDeveloperId && projectId) {
        return res.status(400).json({
          success: false,
          message: 'Developer ID is required for project inquiries.',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      if (phone.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number.',
        });
      }

      // FETCH PROJECT OR PROPERTY (For Snapshot)
      let project: any = null;
      let property: any = null;
      let projectSnapshot: any = null;
      let propertySnapshot: any = null;

      if (projectId) {
        project = await Project.findById(projectId).select(
          'projectName slug city area minPrice maxPrice projectCategory projectNature images gallery developerProfile'
        );

        if (!project) {
          return res.status(404).json({
            success: false,
            message: 'Project not found.',
          });
        }

        let primaryImage = null;
        if (project.images && project.images.length > 0) {
          const primary = project.images.find((img: any) => img.isPrimary);
          primaryImage = primary ? primary.url : project.images[0].url;
        } else if (project.gallery && project.gallery.length > 0) {
          primaryImage = project.gallery[0].url;
        }

        projectSnapshot = {
          _id: project._id,
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
        
      } else if (propertyId) {
        property = await Property.findById(propertyId).select(
          'title slug city society locality price images propertyType listingType owner ownerName ownerEmail ownerPhone'
        );
        if (!property) {
          return res.status(404).json({
            success: false,
            message: 'Property not found.',
          });
        }

        const primaryImage = property.images?.[0]?.url || null;

        // Lead propertySnapshot (IPropertySnapshot shape)
        propertySnapshot = {
          _id: property._id,
          title: property.title || 'Property',
          slug: property.slug,
          city: property.city || 'N/A',
          society: property.society || property.locality || 'N/A',
          price: property.price || 0,
          propertyType: property.propertyType || undefined,
          listingType: property.listingType || undefined,
          primaryImage,
          ownerName: (property as any).ownerName || undefined,
          ownerEmail: (property as any).ownerEmail || undefined,
          ownerPhone: (property as any).ownerPhone || undefined,
        };

        if (!finalDeveloperId && property.owner) {
          finalDeveloperId = property.owner.toString();
        }
      }

      const developerIdToUse = finalDeveloperId || developerId;

      if (!developerIdToUse) {
        return res.status(400).json({
          success: false,
          message: 'Could not determine property owner.',
        });
      }

      const developer: any = await User.findById(developerIdToUse).lean();

if (!developer) {
  return res.status(404).json({
    success: false,
    message: 'Developer not found.',
  });
}

const developerSnapshot = {
  _id: developer._id,
  companyName: developer.companyName || 'N/A',
  email: developer.email,
  phone: (developer as any).phone || undefined,
  logo: (developer as any).logo || undefined,
  website: (developer as any).website || undefined,
};

      const lead = await Lead.create({
        name,
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        cnic,
        message,
        leadType,
        // Entity type — required by Lead model schema
        // Auto-detected from which ID is present
        entityType: projectId ? 'project' : 'property',
        // Project lead case
        project: projectId || undefined,
        projectSnapshot: projectSnapshot || undefined,
        // Property lead case
        property: propertyId || undefined,
        propertySnapshot: propertySnapshot || undefined,
        // Unit (if any)
        unit: unitId || undefined,
        developer: developerIdToUse,
        developerSnapshot,
        source,
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
        assignedToRole: property ? 'agent' : 'developer', // ✅ Auto-detect role
        assignedToUserId: developerIdToUse, // ✅ Add user ID reference
        status: 'new',
      });

      // Increment inquiries on project/property
      if (projectId) {
        await Project.findByIdAndUpdate(projectId, {
          $inc: { inquiries: 1 },
        });
      } else if (propertyId) {
        await Property.findByIdAndUpdate(propertyId, {
          $inc: { inquiries: 1 },
        });
      }

      // ================================
      // 🤖 AUTOMATION ENROLLMENT (fire & forget)
      // Enroll new lead into any active 'lead_created'
      // automation sequences. Non-blocking.
      // ================================
      try {
        const { enrollRecipient } = await import('@/lib/automation/enrollRecipient');
        enrollRecipient('lead_created', {
          recipientId:   String(lead._id),
          recipientType: 'lead',
          email:         lead.email,
          name:          lead.name,
          city:
            projectSnapshot?.city ||
            propertySnapshot?.city ||
            '',
          leadStatus: lead.status,
          leadSource: lead.source,
          leadType:   lead.leadType,
        }).catch((enrollErr: unknown) => {
          console.error('[Automation] lead_created enroll failed:',
            enrollErr instanceof Error ? enrollErr.message : enrollErr
          );
        });
      } catch (importErr) {
        // Dynamic import failed — non-fatal
        console.error('[Automation] Failed to import enrollRecipient:', importErr);
      }

      // ================================
      // 🔔 Email Notification (Non-blocking)
      // ================================
      try {
        const siteUrl = process.env.NEXTAUTH_URL || 'https://highrise.pk';

        const isPropertyLead = !!propertyId;
        const listingTitle =
          propertySnapshot?.title ||
          projectSnapshot?.projectName ||
          'your listing';

        const listingUrl = isPropertyLead
          ? `${siteUrl}/property/${propertySnapshot?.slug || propertyId}`
          : `${siteUrl}/projects/${projectSnapshot?.slug || projectId}`;

        const dashboardUrl = propertyId
          ? `${siteUrl}/agent/leads`
          : `${siteUrl}/developer/leads`;

        const html = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#029bba,#027a94);padding:20px 24px;border-radius:12px 12px 0 0;color:white;">
                <h1 style="margin:0;font-size:20px;">🔔 New Lead Received</h1>
                <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">
                  You have a new lead on <strong>${listingTitle}</strong> via Highrise.pk
                </p>
              </div>
              <div style="background:white;padding:20px 24px;border-radius:0 0 12px 12px;">
                <h2 style="font-size:16px;margin:0 0 10px 0;">Lead Details</h2>
                <table style="width:100%;font-size:14px;color:#374151;margin-bottom:16px;">
                  <tr><td style="padding:4px 0;width:120px;color:#6b7280;">Name:</td><td style="padding:4px 0;font-weight:bold;">${name}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Email:</td><td style="padding:4px 0;">${email}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Phone:</td><td style="padding:4px 0;">${phone}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Type:</td><td style="padding:4px 0;">${leadType}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Source:</td><td style="padding:4px 0;">${source}</td></tr>
                </table>

                ${
                  message
                    ? `
                <div style="background:#f9fafb;border-radius:8px;padding:12px 14px;margin-bottom:16px;border:1px solid #e5e7eb;">
                  <strong style="display:block;margin-bottom:4px;font-size:13px;color:#111827;">Message:</strong>
                  <p style="margin:0;font-size:13px;color:#4b5563;white-space:pre-line;">${message}</p>
                </div>
                `
                    : ''
                }

                <h2 style="font-size:16px;margin:0 0 10px 0;">Listing Details</h2>
                <table style="width:100%;font-size:14px;color:#374151;margin-bottom:20px;">
                  <tr><td style="padding:4px 0;width:120px;color:#6b7280;">Title:</td><td style="padding:4px 0;font-weight:bold;">${listingTitle}</td></tr>
                  ${
                    propertySnapshot?.city || projectSnapshot?.city
                      ? `<tr><td style="padding:4px 0;color:#6b7280;">City:</td><td style="padding:4px 0;">${
                          propertySnapshot?.city || projectSnapshot?.city
                        }</td></tr>`
                      : ''
                  }
                  ${
                    propertySnapshot?.society || projectSnapshot?.area
                      ? `<tr><td style="padding:4px 0;color:#6b7280;">Area:</td><td style="padding:4px 0;">${
                          propertySnapshot?.society || projectSnapshot?.area
                        }</td></tr>`
                      : ''
                  }
                </table>

                <div style="text-align:center;margin-top:10px;">
                  <a href="${dashboardUrl}" 
                     style="display:inline-block;margin:0 4px 8px 4px;background:#029bba;color:white;padding:10px 18px;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">
                    View Lead in Dashboard →
                  </a>
                  <a href="${listingUrl}" 
                     style="display:inline-block;margin:0 4px;background:#f3f4f6;color:#111827;padding:10px 18px;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">
                    Open Listing →
                  </a>
                </div>

                <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">
                  This email was sent by Highrise.pk lead system. Please respond to the client as soon as possible.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        if (developer?.email) {
          await sendEmail({
            to: developer.email,
            subject: `New Lead for ${listingTitle} | Highrise.pk`,
            html,
            fromName: 'Highrise.pk Leads',
          });
        }
      } catch (emailError) {
        console.error('[Leads Email Error]', (emailError as any)?.message || emailError);
        // Email failure should NOT block lead creation
      }

      return res.status(201).json({
        success: true,
        message:
          'Your inquiry has been sent successfully! The developer/agent will contact you soon.',
        data: {
          leadId: lead._id,
          leadScore: lead.leadScore,
          priority: lead.priority,
          status: lead.status,
        },
      });
    } catch (error: any) {
      console.error('[Leads POST Error]', error);
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
      // 🔐 Secure: Get user from NextAuth session
      const session: any = await getServerSession(req, res, authOptions as any);

      if (!session || !session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const currentEmail = session.user.email || '';
      const currentUserId = (session.user as any).id || (session.user as any)._id || '';
      const currentRole = (session.user as any).role || 'user';

      // V6.8.0: Session 3 capability flag pattern
      const isVerifiedAgent = Boolean((session.user as any).isVerifiedAgent);
      const isVerifiedOwner = Boolean((session.user as any).isVerifiedOwner);

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

      if (isAdmin) {
        // Admin sees all leads, optionally filtered by developerId
        if (developerId) {
          filter['developerSnapshot._id'] = developerId;
        }
      } else if (isDeveloper) {
        // Developer sees only their own project leads
        if (currentEmail) {
          filter.$or = [
            { 'developerSnapshot.email': currentEmail },
            { assignedTo: currentEmail },
            { assignedToUserId: currentUserId },
          ];
        }
      } else if (isAgent) {
        // Agent sees only their property leads (matches by owner email/id)
        if (currentEmail) {
          filter.$or = [
            { 'propertySnapshot.ownerEmail': currentEmail },
            { assignedTo: currentEmail },
            { assignedToUserId: currentUserId },
          ];
        }
      } else if (isOwner) {
        // Owner sees only leads on their own property listings
        if (currentEmail) {
          filter.$or = [
            { 'propertySnapshot.ownerEmail': currentEmail },
            { assignedToUserId: currentUserId },
          ];
        }
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

    } catch (error: any) {
      console.error('[Leads GET Error]', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while fetching leads. Please try again.',
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
