// pages/api/admin/recent-activity.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';

import Property from '@/models/Property';
import Project from '@/models/Projects';
import DeveloperProfile from '@/models/DeveloperProfile';
import Lead from '@/models/Lead';
import User from '@/models/User';
import { requireAdmin } from '@/lib/requireAuth';

interface ActivityItem {
  id: string;
  type: 'property' | 'user' | 'developer' | 'inquiry' | 'project';
  title: string;
  description: string;
  time: string;
  status: 'pending' | 'approved' | 'new' | 'rejected';
  createdAt: Date;
}

type ApiResponse =
  | { success: true; activities: Omit<ActivityItem, 'createdAt'>[] }
  | { success: false; message: string; error?: string };

// Helper: Format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

// Helper: Map status to activity status
const mapPropertyStatus = (status: string): ActivityItem['status'] => {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'pending') return 'pending';
  return 'new';
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const activities: ActivityItem[] = [];

    // Fetch recent data in parallel
    const [
      recentProperties,
      recentProjects,
      recentDevelopers,
      recentInquiries,
      recentUsers,
    ] = await Promise.all([
      // Recent properties (last 10)
      Property.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id title city status createdAt')
        .lean(),

      // Recent projects (last 5)
      Project.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id projectName city status createdAt')
        .lean(),

      // Recent developer verifications (last 5)
      DeveloperProfile.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id companyName status createdAt')
        .lean(),

      // Recent inquiries (last 5, property leads only)
      Lead.find({ entityType: 'property', isArchived: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id name message status createdAt')
        .lean(),

      // Recent users (last 5)
      User.find({ role: { $in: ['user', 'developer'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id name email createdAt')
        .lean(),
    ]);

    // Process properties
    recentProperties.forEach((prop: any) => {
      activities.push({
        id: `property-${prop._id}`,
        type: 'property',
        title: prop.status === 'pending' ? 'New Property Listed' : `Property ${prop.status}`,
        description: `${prop.title || 'Untitled'} in ${prop.city || 'Unknown'}`,
        time: formatTimeAgo(new Date(prop.createdAt)),
        status: mapPropertyStatus(prop.status),
        createdAt: new Date(prop.createdAt),
      });
    });

    // Process projects
    recentProjects.forEach((proj: any) => {
      activities.push({
        id: `project-${proj._id}`,
        type: 'project',
        title: proj.status === 'pending' ? 'New Project Submitted' : `Project ${proj.status}`,
        description: `${proj.projectName || 'Untitled'} in ${proj.city || 'Unknown'}`,
        time: formatTimeAgo(new Date(proj.createdAt)),
        status: mapPropertyStatus(proj.status),
        createdAt: new Date(proj.createdAt),
      });
    });

    // Process developers
    recentDevelopers.forEach((dev: any) => {
      activities.push({
        id: `developer-${dev._id}`,
        type: 'developer',
        title: dev.status === 'pending' ? 'Developer Verification Request' : `Developer ${dev.status}`,
        description: dev.companyName || 'Unknown Company',
        time: formatTimeAgo(new Date(dev.createdAt)),
        status: mapPropertyStatus(dev.status),
        createdAt: new Date(dev.createdAt),
      });
    });

    // Process inquiries
    recentInquiries.forEach((inq: any) => {
      activities.push({
        id: `inquiry-${inq._id}`,
        type: 'inquiry',
        title: 'New Inquiry',
        description: `From ${inq.name || 'Anonymous'}: ${(inq.message || '').slice(0, 50)}${(inq.message || '').length > 50 ? '...' : ''}`,
        time: formatTimeAgo(new Date(inq.createdAt)),
        status: inq.status === 'new' ? 'new' : 'pending',
        createdAt: new Date(inq.createdAt),
      });
    });

    // Process users
    recentUsers.forEach((user: any) => {
      activities.push({
        id: `user-${user._id}`,
        type: 'user',
        title: 'New User Registration',
        description: `${user.email || 'Unknown'} joined the platform`,
        time: formatTimeAgo(new Date(user.createdAt)),
        status: 'new',
        createdAt: new Date(user.createdAt),
      });
    });

    // Sort all activities by createdAt (most recent first)
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Take only top 10
    const topActivities = activities.slice(0, 10);

    // Remove createdAt from response (we only needed it for sorting)
    const formattedActivities = topActivities.map(({ createdAt, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      activities: formattedActivities,
    });
  } catch (error: any) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load recent activity',
      error: error?.message || 'Unknown error',
    });
  }
}
