import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import Review from '@/models/Review';
import Project from '@/models/Projects';
import DOMPurify from 'isomorphic-dompurify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // ---------------------------------------------------------------------------
  // GET: Fetch Public Approved Reviews
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const reviews = await Review.find({ 
        entityType: 'project', 
        entityId: id, 
        status: 'approved',
        isDeleted: false 
      })
        .populate('userId', 'name image profilePictureUrl')
        .sort({ isFeatured: -1, 'votes.helpful': -1, createdAt: -1 })
        .limit(20)
        .lean();

      return res.status(200).json({ success: true, reviews });
    } catch (error) {
      console.error('Review fetch error:', error);
      return res.status(500).json({ success: false, message: 'Server Error' });
    }
  }

  // ---------------------------------------------------------------------------
  // POST: Submit a New Review (Auth Required)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      // 1. Auth Guard
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }

      // 2. Input Validation
      const { rating, content } = req.body;
      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Invalid rating. Must be between 1 and 5.' });
      }
      if (!content || typeof content !== 'string' || content.trim().length < 20) {
        return res.status(400).json({ success: false, message: 'Review must be at least 20 characters.' });
      }

      // 3. Injection Defense & Sanitization
      const cleanContent = DOMPurify.sanitize(content.trim(), { ALLOWED_TAGS: [] });

      // 4. Verify Project Exists
      const project = await Project.findById(id).select('projectName slug city');
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      // 5. Save using polymorphic schema (defaults to 'pending')
      await Review.create({
        entityType: 'project',
        entityId: id,
        entitySnapshot: {
          name: project.projectName,
          slug: project.slug,
          city: project.city
        },
        userId: session.user.id,
        reviewerName: session.user.name || 'Verified User',
        reviewerEmail: session.user.email || 'no-email@highrise.pk',
        rating,
        content: cleanContent,
        status: 'pending',
        isAnonymous: false,
        isVerifiedPurchase: false
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Review submitted successfully! It will appear once approved by moderation.' 
      });

    } catch (error: any) {
      // Handle the unique compound index error natively
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'You have already submitted a review for this project.' });
      }
      console.error('Review submission error:', error);
      return res.status(500).json({ success: false, message: 'Failed to submit review. Please try again.' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}