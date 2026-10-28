import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { assertWriteAllowed } from '@/lib/dbGuard';
import Project from '@/models/Projects';
import Property from '@/models/Property';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security Guard: Never run in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed scripts are disabled in production.' });
  }

  // Security Guard (Phase 0): disabled by default — fail-closed
  if (process.env.DEMO_SEED_ENABLED !== '1') {
    return res.status(403).json({
      error:
        'Demo seeding is disabled by default. Set DEMO_SEED_ENABLED=1 and point MONGODB_URI at an isolated non-production database to enable.',
    });
  }

  // Security Guard (Phase 0): only clearly non-production database targets are writable
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return res.status(500).json({ error: 'MONGODB_URI is not configured.' });
  }
  try {
    assertWriteAllowed(mongoUri, { purpose: 'demo seed endpoint' });
  } catch (guardError) {
    return res.status(403).json({
      error: guardError instanceof Error ? guardError.message : 'Refused by database write guard.',
    });
  }

  await dbConnect();

  // ─── CLEANUP MODE (DELETE) ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      // Deterministic filter: ONLY deletes records starting with "mock-"
      const projRes = await Project.deleteMany({ slug: { $regex: '^mock-' } });
      const propRes = await Property.deleteMany({ slug: { $regex: '^mock-' } });

      return res.status(200).json({
        success: true,
        message: 'Mock data cleaned successfully.',
        deletedProjects: projRes.deletedCount,
        deletedProperties: propRes.deletedCount,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: String(error) });
    }
  }

  // ─── SEED MODE (POST) ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      // 1. Wipe existing mock data to prevent duplicates
      await Project.deleteMany({ slug: { $regex: '^mock-' } });
      await Property.deleteMany({ slug: { $regex: '^mock-' } });

      // Guaranteed Cloudinary sample assets (Whitelisted & never blocked by localhost fetch)
      const img1 = 'https://res.cloudinary.com/demo/image/upload/v1312461206/sample.jpg';
      const img2 = 'https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg';
      const img3 = 'https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg';
      const img4 = 'https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg';
      const img5 = 'https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg';

      const mockDevId = new mongoose.Types.ObjectId();

      // 2. Generate Diverse Projects
      const projectsToInsert = [
        {
          projectName: '[MOCK] Skyview Towers',
          slug: 'mock-skyview-towers-isb',
          tagline: 'Luxury High-Rise in Islamabad',
          city: 'Islamabad',
          area: 'Sector E-11',
          location: {
            type: 'Point',
            coordinates: [72.9778, 33.6989], // Islamabad E-11 [lng, lat]
          },
          projectCategory: 'high_rise',
          projectNature: 'residential',
          projectStatus: 'Under Development',
          saleMode: 'Installment',
          minPrice: 15000000,
          maxPrice: 45000000,
          isVerified: true,
          isFeatured: true,
          promotionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Promoted for 30 days
          status: 'verified',
          verificationStatus: 'verified',
          developerApprovalStatus: 'approved',
          nocStatus: 'approved',
          approvalAuthority: 'CDA',
          highriseScore: 92,
          developerId: mockDevId,
          createdBy: mockDevId,
          developerName: 'Mock Builders Inc',
          developerBadge: 'premium',
          featureImageUrl: img1,
          images: [
            { url: img1, public_id: 'mock/img1', isPrimary: true },
            { url: img2, public_id: 'mock/img2', isPrimary: false },
            { url: img3, public_id: 'mock/img3', isPrimary: false },
            { url: img4, public_id: 'mock/img4', isPrimary: false },
            { url: img5, public_id: 'mock/img5', isPrimary: false },
          ], // Tests the hover carousel
          unitsAvailable: 4, // Tests the "Urgency" red badge
        },
        {
          projectName: '[MOCK] Green Valley Phase 2',
          slug: 'mock-green-valley-lhr',
          tagline: 'Premium Housing Society',
          city: 'Lahore',
          area: 'DHA Phase 8',
          location: {
            type: 'Point',
            coordinates: [74.4321, 31.4789], // Lahore DHA Phase 8 [lng, lat]
          },
          projectCategory: 'housing_society',
          projectNature: 'residential',
          projectStatus: 'Completed',
          saleMode: 'Full Payment',
          minPrice: 25000000,
          maxPrice: 85000000,
          isVerified: true,
          isFeatured: false,
          status: 'verified',
          verificationStatus: 'verified',
          developerApprovalStatus: 'approved',
          nocStatus: 'approved',
          approvalAuthority: 'LDA',
          highriseScore: 85,
          developerId: mockDevId,
          createdBy: mockDevId,
          developerName: 'Mock Developments',
          developerBadge: 'trusted',
          featureImageUrl: img2,
          images: [
            { url: img2, public_id: 'mock/img2_solo', isPrimary: true },
          ], // Tests the 1-image static fallback (no arrows)
          unitsAvailable: 15,
        },
        {
          projectName: '[MOCK] The Boulevard Mall',
          slug: 'mock-boulevard-mall-khi',
          tagline: 'Commercial Hub of Karachi',
          city: 'Karachi',
          area: 'Clifton',
          location: {
            type: 'Point',
            coordinates: [67.0311, 24.8214], // Karachi Clifton [lng, lat]
          },
          projectCategory: 'commercial_plaza',
          projectNature: 'commercial',
          projectStatus: 'Launched',
          saleMode: 'Both',
          minPrice: 50000000,
          maxPrice: 150000000,
          isVerified: true,
          isFeatured: false,
          status: 'verified',
          verificationStatus: 'verified',
          developerApprovalStatus: 'approved',
          nocStatus: 'pending',
          highriseScore: 65,
          developerId: mockDevId,
          createdBy: mockDevId,
          developerName: 'Mock Commercial Ltd',
          developerBadge: 'emerging',
          featureImageUrl: img3,
          images: [
            { url: img3, public_id: 'mock/img3_1', isPrimary: true },
            { url: img4, public_id: 'mock/img4_1', isPrimary: false },
            { url: img5, public_id: 'mock/img5_1', isPrimary: false },
          ],
          unitsAvailable: null,
        },
      ];

      // 3. Generate Exit-Intent Cross-Sell Properties
      const propertiesToInsert = [
        {
          title: '[MOCK] 10 Marla Plot in DHA',
          slug: 'mock-10-marla-dha',
          price: 18000000,
          city: 'Lahore',
          location: 'DHA Phase 6',
          propertyType: 'plot',
          purpose: 'sale',
          description: 'Prime 10 Marla residential plot located in DHA Phase 6, Lahore.',
          area: 10,
          unit: 'Marla',
          owner: mockDevId,
          status: 'available',
          verification: { status: 'verified' },
          featureImageUrl: img4,
          images: [{ url: img4, public_id: 'mock/prop_img4', isPrimary: true }],
        },
        {
          title: '[MOCK] 2 Bed Apartment in F-11',
          slug: 'mock-2-bed-apt-isb',
          price: 22000000,
          city: 'Islamabad',
          location: 'Sector F-11',
          propertyType: 'apartment',
          purpose: 'sale',
          bedrooms: 2,
          description: 'Luxury 2 Bed apartment with modern amenities in Sector F-11, Islamabad.',
          area: 5,
          unit: 'Marla',
          owner: mockDevId,
          status: 'available',
          verification: { status: 'verified' },
          featureImageUrl: img5,
          images: [{ url: img5, public_id: 'mock/prop_img5', isPrimary: true }],
        },
      ];

      // Insert into DB (Bypassing strict Mongoose validation schemas using insertMany)
      const createdProjects = await Project.insertMany(projectsToInsert);
      const createdProperties = await Property.insertMany(propertiesToInsert);

      return res.status(200).json({
        success: true,
        message: 'Mock data seeded successfully!',
        projectsSeeded: createdProjects.length,
        propertiesSeeded: createdProperties.length,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed. Use POST to seed, DELETE to cleanup.' });
}