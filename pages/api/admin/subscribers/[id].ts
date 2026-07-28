// pages/api/admin/subscribers/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Subscriber ID is required',
    });
  }

  // GET - Get single subscriber
  if (req.method === 'GET') {
    try {
      const subscriber = await NewsletterSubscriber.findById(id).lean();

      if (!subscriber) {
        return res.status(404).json({
          success: false,
          message: 'Subscriber not found',
        });
      }

      return res.status(200).json({
        success: true,
        subscriber,
      });
    } catch (error: any) {
      console.error('Error fetching subscriber:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching subscriber',
        error: error.message,
      });
    }
  }

  // PUT - Update subscriber
  if (req.method === 'PUT') {
    try {
      const { name, status, tags } = req.body;

      const subscriber = await NewsletterSubscriber.findById(id);

      if (!subscriber) {
        return res.status(404).json({
          success: false,
          message: 'Subscriber not found',
        });
      }

      // Update fields
      if (name !== undefined) subscriber.name = name;
      if (status !== undefined) {
        subscriber.status = status;
        if (status === 'unsubscribed') {
          subscriber.unsubscribedAt = new Date();
        } else if (status === 'active') {
          subscriber.unsubscribedAt = undefined;
        }
      }
      if (tags !== undefined) subscriber.tags = tags;

      await subscriber.save();

      return res.status(200).json({
        success: true,
        message: 'Subscriber updated successfully',
        subscriber,
      });
    } catch (error: any) {
      console.error('Error updating subscriber:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating subscriber',
        error: error.message,
      });
    }
  }

  // DELETE - Delete subscriber
  if (req.method === 'DELETE') {
    try {
      const subscriber = await NewsletterSubscriber.findByIdAndDelete(id);

      if (!subscriber) {
        return res.status(404).json({
          success: false,
          message: 'Subscriber not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Subscriber deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting subscriber:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting subscriber',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}