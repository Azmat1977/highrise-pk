// pages/api/admin/settings.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  await dbConnect();

  // GET - Fetch settings
  if (req.method === 'GET') {
    try {
      // Get settings (creates default if doesn't exist)
      let settings = await Settings.findOne().lean();
      
      if (!settings) {
        // Create default settings
        settings = await Settings.create({});
        settings = await Settings.findOne().lean();
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch settings',
        message: error.message,
      });
    }
  }

  // PUT - Update settings
  if (req.method === 'PUT') {
    try {
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.createdAt;
      delete updates.__v;

      // Add updated timestamp
      updates.updatedAt = new Date();

      // Find and update (or create if doesn't exist)
      let settings = await Settings.findOne();

      if (!settings) {
        // Create with provided data
        settings = await Settings.create(updates);
      } else {
        // Update existing
        Object.keys(updates).forEach((key) => {
          if (updates[key] !== undefined) {
            (settings as any)[key] = updates[key];
          }
        });
        await settings.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: settings,
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error.message,
      });
    }
  }

  // PATCH - Update specific section
  if (req.method === 'PATCH') {
    try {
      const { section, data } = req.body;

      if (!section || !data) {
        return res.status(400).json({
          success: false,
          error: 'Section and data are required',
        });
      }

      let settings = await Settings.findOne();

      if (!settings) {
        settings = await Settings.create({});
      }

      // Update specific fields based on section
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined) {
          (settings as any)[key] = data[key];
        }
      });

      settings.updatedAt = new Date();
      await settings.save();

      return res.status(200).json({
        success: true,
        message: `${section} settings updated successfully`,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error updating settings section:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        message: error.message,
      });
    }
  }

  // POST - Reset to defaults
  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      if (action === 'reset') {
        // Delete existing and create new with defaults
        await Settings.deleteMany({});
        const settings = await Settings.create({});

        return res.status(200).json({
          success: true,
          message: 'Settings reset to defaults',
          data: settings,
        });
      }

      if (action === 'test-email') {
        // This would test email configuration
        // For now, just return success
        return res.status(200).json({
          success: true,
          message: 'Email configuration test - check your implementation',
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action',
      });
    } catch (error: any) {
      console.error('Error with settings action:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to perform action',
        message: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
