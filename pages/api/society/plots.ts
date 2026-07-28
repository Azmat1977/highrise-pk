// pages/api/society/plots.ts
// Highrise.pk — Society Portal: Plot Inventory API
// GET   → return plotInventory array for own society
// POST  → add new plot inventory entry
// PATCH → update existing entry by size key
// DELETE→ remove entry by size key
// NO console.* | NO as any | NO findByIdAndUpdate

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import SocietyProfile from '@/models/SocietyProfile';
import type { IPlotInventory, SocietyPlotSize } from '@/models/SocietyProfile';
import { requireSociety } from '@/lib/requireAuth';
import { z } from 'zod';
import mongoose from 'mongoose';
import type { Types } from 'mongoose';

// ─── Response types ───────────────────────────────────────────────────────────

interface ApiResponse {
  success: boolean;
  plots?: IPlotInventory[];
  message?: string;
  errors?: Record<string, string[]>;
}

// ─── Plot size enum ───────────────────────────────────────────────────────────

const PLOT_SIZE_VALUES = [
  '3_marla', '4_marla', '5_marla', '6_marla', '7_marla',
  '8_marla', '10_marla', '12_marla', '1_kanal', '1_kanal_4_marla',
  '2_kanal', 'commercial', 'other',
] as const;

// ─── Validation schemas ───────────────────────────────────────────────────────

const PlotEntrySchema = z.object({
  size: z.enum(PLOT_SIZE_VALUES),
  totalPlots: z.number().int().min(0).max(100000),
  availablePlots: z.number().int().min(0).max(100000),
  pricePerMarla: z.number().min(0).optional(),
  pricePerSqFt: z.number().min(0).optional(),
}).refine(
  (d) => d.availablePlots <= d.totalPlots,
  { message: 'Available plots cannot exceed total plots.', path: ['availablePlots'] }
);

const PatchPlotSchema = z.object({
  size: z.enum(PLOT_SIZE_VALUES),                         // identifies which entry
  totalPlots: z.number().int().min(0).max(100000).optional(),
  availablePlots: z.number().int().min(0).max(100000).optional(),
  pricePerMarla: z.number().min(0).optional(),
  pricePerSqFt: z.number().min(0).optional(),
});

const DeletePlotSchema = z.object({
  size: z.enum(PLOT_SIZE_VALUES),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const authResult = await requireSociety(req, res);
  if (!authResult) return;

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(authResult.id);

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const profile = await SocietyProfile
      .findOne({ userId })
      .select('plotInventory')
      .lean<{ plotInventory: IPlotInventory[] }>();

    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    res.status(200).json({ success: true, plots: profile.plotInventory });
    return;
  }

  // ── POST — add new entry ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const parsed = PlotEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
      return;
    }

    const profile = await SocietyProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    // Reject duplicate size entries
    const exists = profile.plotInventory.some((p) => p.size === parsed.data.size);
    if (exists) {
      res.status(409).json({
        success: false,
        message: `A plot entry for size "${parsed.data.size}" already exists. Use PATCH to update it.`,
      });
      return;
    }

    profile.plotInventory.push(parsed.data as IPlotInventory);
    profile.auditTrail.push({
      action: 'updated',
      performedBy: userId,
      performedAt: new Date(),
      note: `Plot inventory entry added: ${parsed.data.size}`,
    });

    await profile.save();

    res.status(201).json({ success: true, plots: profile.plotInventory });
    return;
  }

  // ── PATCH — update existing entry ────────────────────────────────────────
  if (req.method === 'PATCH') {
    const parsed = PatchPlotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
      return;
    }

    const profile = await SocietyProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    const entry = profile.plotInventory.find((p) => p.size === parsed.data.size);
    if (!entry) {
      res.status(404).json({
        success: false,
        message: `No plot inventory entry found for size "${parsed.data.size}".`,
      });
      return;
    }

    // Apply partial updates
    if (parsed.data.totalPlots !== undefined) entry.totalPlots = parsed.data.totalPlots;
    if (parsed.data.availablePlots !== undefined) entry.availablePlots = parsed.data.availablePlots;
    if (parsed.data.pricePerMarla !== undefined) entry.pricePerMarla = parsed.data.pricePerMarla;
    if (parsed.data.pricePerSqFt !== undefined) entry.pricePerSqFt = parsed.data.pricePerSqFt;

    // Validate constraint after update
    if (entry.availablePlots > entry.totalPlots) {
      res.status(400).json({
        success: false,
        message: 'Available plots cannot exceed total plots.',
      });
      return;
    }

    profile.auditTrail.push({
      action: 'updated',
      performedBy: userId,
      performedAt: new Date(),
      note: `Plot inventory updated: ${parsed.data.size}`,
    });

    await profile.save();

    res.status(200).json({ success: true, plots: profile.plotInventory });
    return;
  }

  // ── DELETE — remove entry ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const parsed = DeletePlotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
      return;
    }

    const profile = await SocietyProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Society profile not found.' });
      return;
    }

    const before = profile.plotInventory.length;
    profile.plotInventory = profile.plotInventory.filter(
      (p) => p.size !== parsed.data.size
    ) as IPlotInventory[];

    if (profile.plotInventory.length === before) {
      res.status(404).json({
        success: false,
        message: `No plot entry found for size "${parsed.data.size}".`,
      });
      return;
    }

    profile.auditTrail.push({
      action: 'updated',
      performedBy: userId,
      performedAt: new Date(),
      note: `Plot inventory entry removed: ${parsed.data.size}`,
    });

    await profile.save();

    res.status(200).json({ success: true, plots: profile.plotInventory });
    return;
  }

  res.status(405).json({ success: false, message: 'Method not allowed.' });
}