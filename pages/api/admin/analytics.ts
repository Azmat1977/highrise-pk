// pages/api/admin/analytics.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Property from '@/models/Property';
import User from '@/models/User';
import Blog from '@/models/Blog';
import Email from '@/models/Email';
import Comment from '@/models/Comment';
import DeveloperProfile from '@/models/DeveloperProfile';
import Lead from '@/models/Lead';

// Helper function to get date range
function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  switch (range) {
    case '7days':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90days':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  return { startDate, endDate };
}

// Helper function to generate date labels
function generateDateLabels(startDate: Date, endDate: Date): string[] {
  const labels: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    labels.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return labels;
}

// Helper to calculate percentage change
function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { range = '30days' } = req.query;
    const { startDate, endDate } = getDateRange(range as string);
    
    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    // ============ OVERVIEW STATS ============
    
    // Current period counts
    const [
      totalProperties,
      propertiesApproved,
      propertiesPending,
      propertiesRejected,
      propertiesDraft,
      newPropertiesCurrentPeriod,
      newPropertiesPreviousPeriod,
      
      totalUsers,
      usersActive,
      usersPending,
      usersSuspended,
      usersBanned,
      newUsersCurrentPeriod,
      newUsersPreviousPeriod,
      
      totalBlogs,
      blogsPublished,
      blogsDraft,
      blogsScheduled,
      newBlogsCurrentPeriod,
      newBlogsPreviousPeriod,
      
      totalEmails,
      emailsSent,
      emailsFailed,
      emailsPending,
      newEmailsCurrentPeriod,
      newEmailsPreviousPeriod,
      
      totalDevelopers,
      developersVerified,
      developersPending,
      
      totalInquiries,
      inquiriesNew,
      inquiriesContacted,
      
      totalComments,
      commentsApproved,
      commentsPending,
    ] = await Promise.all([
      // Properties
      Property.countDocuments({ isDeleted: { $ne: true } }),
      Property.countDocuments({ status: 'approved', isDeleted: { $ne: true } }),
      Property.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      Property.countDocuments({ status: 'rejected', isDeleted: { $ne: true } }),
      Property.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
      Property.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } }),
      Property.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate }, isDeleted: { $ne: true } }),
      
      // Users
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
      User.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      User.countDocuments({ status: 'suspended', isDeleted: { $ne: true } }),
      User.countDocuments({ status: 'banned', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate }, isDeleted: { $ne: true } }),
      
      // Blogs
      Blog.countDocuments({ isDeleted: { $ne: true } }),
      Blog.countDocuments({ status: 'published', isDeleted: { $ne: true } }),
      Blog.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
      Blog.countDocuments({ status: 'scheduled', isDeleted: { $ne: true } }),
      Blog.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, isDeleted: { $ne: true } }),
      Blog.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate }, isDeleted: { $ne: true } }),
      
      // Emails
      Email.countDocuments({}),
      Email.countDocuments({ status: 'sent' }),
      Email.countDocuments({ status: 'failed' }),
      Email.countDocuments({ status: 'pending' }),
      Email.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Email.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate } }),
      
      // Developers
      DeveloperProfile.countDocuments({ isDeleted: { $ne: true } }),
      DeveloperProfile.countDocuments({ status: 'approved', isDeleted: { $ne: true } }),
      DeveloperProfile.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      
      // Inquiries (property leads only)
      Lead.countDocuments({ entityType: 'property', isArchived: false }),
      Lead.countDocuments({ entityType: 'property', isArchived: false, status: 'new' }),
      Lead.countDocuments({ entityType: 'property', isArchived: false, status: 'contacted' }),
      
      // Comments
      Comment.countDocuments({ isDeleted: { $ne: true } }),
      Comment.countDocuments({ status: 'approved', isDeleted: { $ne: true } }),
      Comment.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
    ]);

    // ============ TIME SERIES DATA ============
    
    const dateLabels = generateDateLabels(startDate, endDate);
    
    // Get daily user registrations
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get daily property submissions
    const propertyTrendsData = await Property.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get daily emails sent
    const emailTrendsData = await Email.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'sent'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert to chart-friendly format
    const userGrowthMap = new Map(userGrowthData.map(item => [item._id, item.count]));
    const propertyTrendsMap = new Map(propertyTrendsData.map(item => [item._id, item.count]));
    const emailTrendsMap = new Map(emailTrendsData.map(item => [item._id, item.count]));

    const userGrowthChart = dateLabels.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: userGrowthMap.get(date) || 0
    }));

    const propertyTrendsChart = dateLabels.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      properties: propertyTrendsMap.get(date) || 0
    }));

    const emailTrendsChart = dateLabels.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      emails: emailTrendsMap.get(date) || 0
    }));

    // ============ TOP PROPERTIES ============
    
    const topProperties = await Property.find({ isDeleted: { $ne: true } })
      .sort({ views: -1, createdAt: -1 })
      .limit(5)
      .select('title views status createdAt city propertyType')
      .lean();

    // Get inquiry counts for top properties
    const topPropertiesWithInquiries = await Promise.all(
      topProperties.map(async (property: any) => {
        const inquiryCount = await Lead.countDocuments({
          entityType: 'property',
          property: property._id,
          isArchived: false,
        });
        return {
          _id: property._id,
          title: property.title || 'Untitled Property',
          views: property.views || 0,
          inquiries: inquiryCount,
          status: property.status || 'pending',
          city: property.city || 'N/A',
          propertyType: property.propertyType || 'N/A'
        };
      })
    );

    // ============ TOP BLOGS ============
    
    const topBlogs = await Blog.find({ 
      isDeleted: { $ne: true },
      status: 'published'
    })
      .sort({ views: -1 })
      .limit(5)
      .select('title views slug createdAt')
      .lean();

    const topBlogsWithComments = await Promise.all(
      topBlogs.map(async (blog: any) => {
        const commentCount = await Comment.countDocuments({ 
          blogId: blog._id,
          status: 'approved',
          isDeleted: { $ne: true }
        });
        return {
          _id: blog._id,
          title: blog.title || 'Untitled Blog',
          views: blog.views || 0,
          comments: commentCount,
          slug: blog.slug
        };
      })
    );

    // ============ RESPONSE ============
    
    const response = {
      success: true,
      data: {
        overview: {
          properties: {
            total: totalProperties,
            change: calculateChange(newPropertiesCurrentPeriod, newPropertiesPreviousPeriod),
            approved: propertiesApproved,
            pending: propertiesPending,
            rejected: propertiesRejected,
            draft: propertiesDraft
          },
          users: {
            total: totalUsers,
            change: calculateChange(newUsersCurrentPeriod, newUsersPreviousPeriod),
            active: usersActive,
            pending: usersPending,
            suspended: usersSuspended,
            banned: usersBanned
          },
          blogs: {
            total: totalBlogs,
            change: calculateChange(newBlogsCurrentPeriod, newBlogsPreviousPeriod),
            published: blogsPublished,
            draft: blogsDraft,
            scheduled: blogsScheduled
          },
          emails: {
            total: totalEmails,
            change: calculateChange(newEmailsCurrentPeriod, newEmailsPreviousPeriod),
            sent: emailsSent,
            failed: emailsFailed,
            pending: emailsPending
          },
          developers: {
            total: totalDevelopers,
            verified: developersVerified,
            pending: developersPending
          },
          inquiries: {
            total: totalInquiries,
            new: inquiriesNew,
            contacted: inquiriesContacted
          },
          comments: {
            total: totalComments,
            approved: commentsApproved,
            pending: commentsPending
          }
        },
        charts: {
          userGrowth: userGrowthChart,
          propertyTrends: propertyTrendsChart,
          emailTrends: emailTrendsChart,
          propertyStatus: [
            { name: 'Approved', value: propertiesApproved, color: '#22c55e' },
            { name: 'Pending', value: propertiesPending, color: '#eab308' },
            { name: 'Rejected', value: propertiesRejected, color: '#ef4444' },
            { name: 'Draft', value: propertiesDraft, color: '#6b7280' }
          ],
          emailStatus: [
            { name: 'Sent', value: emailsSent, color: '#22c55e' },
            { name: 'Failed', value: emailsFailed, color: '#ef4444' },
            { name: 'Pending', value: emailsPending, color: '#eab308' }
          ],
          userStatus: [
            { name: 'Active', value: usersActive, color: '#22c55e' },
            { name: 'Pending', value: usersPending, color: '#eab308' },
            { name: 'Suspended', value: usersSuspended, color: '#f97316' },
            { name: 'Banned', value: usersBanned, color: '#ef4444' }
          ]
        },
        topProperties: topPropertiesWithInquiries,
        topBlogs: topBlogsWithComments,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          range: range
        }
      }
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error?.message || 'Unknown error'
    });
  }
}
