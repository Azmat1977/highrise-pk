// pages/api/developer/team.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const TeamMemberSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().max(254).toLowerCase(),
  phone:    z.string().max(20).optional(),
  role:     z.enum(['owner', 'admin', 'sales', 'marketing', 'support', 'viewer']),
  isActive: z.boolean().optional().default(true),
});

const UpdateMemberSchema = TeamMemberSchema.partial().extend({
  _id:      z.string().min(24).max(24),
  role:     z.enum(['owner', 'admin', 'sales', 'marketing', 'support', 'viewer']).optional(),
});

const DeleteMemberSchema = z.object({
  memberId: z.string().min(24).max(24),
});

// ════════════════════════════════════════════════════
// TEAM MEMBER MONGOOSE SCHEMA
// ════════════════════════════════════════════════════

// We store team members embedded in DeveloperProfile
// to avoid creating a separate collection for MVP
// teamMembers: [] array inside DeveloperProfile

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

/**
 * Get developer profile from session user._id
 * Returns null if not found
 */
async function getDeveloperProfile(userId: string): Promise<{
  _id: mongoose.Types.ObjectId;
  teamMembers?: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastActive?: Date;
  }>;
} | null> {
  const DeveloperProfile = mongoose.models.DeveloperProfile as
    mongoose.Model<mongoose.Document>;

  if (!DeveloperProfile) return null;

  return DeveloperProfile.findOne(
    { user: new mongoose.Types.ObjectId(userId) },
    { _id: 1, teamMembers: 1 }
  ).lean() as Promise<{
    _id: mongoose.Types.ObjectId;
    teamMembers?: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
      phone?: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
      lastActive?: Date;
    }>;
  } | null>;
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role guard ──
  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // ── Rate limit ──
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  // ════════════════════════════════════════════════════
  // GET — List team members
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const devProfile = await getDeveloperProfile(auth.id);

      if (!devProfile) {
        return res.status(404).json({
          success: false,
          message: 'Developer profile not found',
        });
      }

      // Sort: owner first, then by createdAt desc
      const members = (devProfile.teamMembers ?? [])
        .sort((a, b) => {
          if (a.role === 'owner' && b.role !== 'owner') return -1;
          if (a.role !== 'owner' && b.role === 'owner') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .map((member) => ({
          _id:        member._id,
          name:       member.name,
          email:      member.email,
          phone:      member.phone,
          role:       member.role,
          isActive:   member.isActive,
          createdAt:  member.createdAt,
          lastActive: member.lastActive,
        }));

      return res.status(200).json({
        success: true,
        data: {
          members,
          totalMembers: members.length,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action: 'developer_team_fetch_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // POST — Add new team member
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      // Zod validation
      const parsed = TeamMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid member data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { name, email, phone, role: memberRole, isActive } = parsed.data;

      // Get developer profile
      const devProfile = await getDeveloperProfile(auth.id);
      if (!devProfile) {
        return res.status(404).json({
          success: false,
          message: 'Developer profile not found. Please complete your profile first.',
        });
      }

      const existingMembers = devProfile.teamMembers ?? [];

      // Business rules
      // Max 20 team members
      if (existingMembers.length >= 20) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 20 team members allowed',
        });
      }

      // Only one owner allowed
      if (memberRole === 'owner') {
        const hasOwner = existingMembers.some((m) => m.role === 'owner');
        if (hasOwner) {
          return res.status(400).json({
            success: false,
            message: 'Only one owner is allowed per team. Please assign a different role.',
          });
        }
      }

      // Duplicate email check
      const emailExists = existingMembers.some(
        (m) => m.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: `A team member with email "${email}" already exists`,
        });
      }

      // Build new member
      const newMember = {
        _id:       new mongoose.Types.ObjectId(),
        name:      name.trim(),
        email:     email.toLowerCase().trim(),
        phone:     phone?.trim(),
        role:      memberRole,
        isActive:  isActive ?? true,
        createdAt: new Date(),
      };

      // Add to profile
      const DeveloperProfile = mongoose.models.DeveloperProfile as
        mongoose.Model<mongoose.Document>;

      await DeveloperProfile.findByIdAndUpdate(
        devProfile._id,
        { $push: { teamMembers: newMember } },
        { runValidators: false }
      );

      // Audit log
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:    'developer_team_member_added',
          memberId:  String(newMember._id),
          memberEmail: email,
          memberRole,
        },
      });

      return res.status(201).json({
        success: true,
        message: `${name} has been added to your team`,
        data: {
          member: newMember,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action: 'developer_team_member_add_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // PATCH — Update team member
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      // Zod validation
      const parsed = UpdateMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid update data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { _id: memberId, ...updates } = parsed.data;

      if (!mongoose.isValidObjectId(memberId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid member ID',
        });
      }

      // Get developer profile
      const devProfile = await getDeveloperProfile(auth.id);
      if (!devProfile) {
        return res.status(404).json({
          success: false,
          message: 'Developer profile not found',
        });
      }

      const existingMembers = devProfile.teamMembers ?? [];

      // Find the member
      const memberToUpdate = existingMembers.find(
        (m) => m._id.toString() === memberId
      );

      if (!memberToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      // Business rules
      // Cannot demote last owner
      if (memberToUpdate.role === 'owner' && updates.role && updates.role !== 'owner') {
        const ownerCount = existingMembers.filter((m) => m.role === 'owner').length;
        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change role of the only owner. Assign another owner first.',
          });
        }
      }

      // Cannot promote to owner if one already exists
      if (updates.role === 'owner' && memberToUpdate.role !== 'owner') {
        const hasOwner = existingMembers.some(
          (m) => m.role === 'owner' && m._id.toString() !== memberId
        );
        if (hasOwner) {
          return res.status(400).json({
            success: false,
            message: 'Only one owner is allowed. Please demote the current owner first.',
          });
        }
      }

      // Check email uniqueness if email is being changed
      if (updates.email && updates.email !== memberToUpdate.email) {
        const emailExists = existingMembers.some(
          (m) =>
            m.email.toLowerCase() === updates.email!.toLowerCase() &&
            m._id.toString() !== memberId
        );
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: `Email "${updates.email}" is already used by another team member`,
          });
        }
      }

      // Build $set payload for positional update
      const setFields: Record<string, unknown> = {};
      if (updates.name     !== undefined) setFields['teamMembers.$.name']     = updates.name.trim();
      if (updates.email    !== undefined) setFields['teamMembers.$.email']    = updates.email.toLowerCase().trim();
      if (updates.phone    !== undefined) setFields['teamMembers.$.phone']    = updates.phone?.trim();
      if (updates.role     !== undefined) setFields['teamMembers.$.role']     = updates.role;
      if (updates.isActive !== undefined) setFields['teamMembers.$.isActive'] = updates.isActive;
      setFields['teamMembers.$.updatedAt'] = new Date();

      if (Object.keys(setFields).length === 1) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided to update',
        });
      }

      const DeveloperProfile = mongoose.models.DeveloperProfile as
        mongoose.Model<mongoose.Document>;

      const result = await DeveloperProfile.findOneAndUpdate(
        {
          _id:               devProfile._id,
          'teamMembers._id': new mongoose.Types.ObjectId(memberId),
        },
        { $set: setFields },
        { new: true, runValidators: false }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found or update failed',
        });
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:    'developer_team_member_updated',
          memberId,
          updatedFields: Object.keys(updates),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Team member updated successfully',
        data: { memberId },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action: 'developer_team_member_update_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // DELETE — Remove team member
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      // Zod validation
      const parsed = DeleteMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { memberId } = parsed.data;

      if (!mongoose.isValidObjectId(memberId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid member ID',
        });
      }

      // Get developer profile
      const devProfile = await getDeveloperProfile(auth.id);
      if (!devProfile) {
        return res.status(404).json({
          success: false,
          message: 'Developer profile not found',
        });
      }

      const existingMembers = devProfile.teamMembers ?? [];

      // Find member to delete
      const memberToDelete = existingMembers.find(
        (m) => m._id.toString() === memberId
      );

      if (!memberToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      // Business rule: cannot delete the only owner
      if (memberToDelete.role === 'owner') {
        const ownerCount = existingMembers.filter((m) => m.role === 'owner').length;
        if (ownerCount <= 1) {
          return res.status(403).json({
            success: false,
            message: 'Cannot remove the only owner of the team',
          });
        }
      }

      // Remove from array
      const DeveloperProfile = mongoose.models.DeveloperProfile as
        mongoose.Model<mongoose.Document>;

      await DeveloperProfile.findByIdAndUpdate(
        devProfile._id,
        {
          $pull: {
            teamMembers: { _id: new mongoose.Types.ObjectId(memberId) },
          },
        },
        { runValidators: false }
      );

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:      'developer_team_member_removed',
          memberId,
          memberName:  memberToDelete.name,
          memberEmail: memberToDelete.email,
          memberRole:  memberToDelete.role,
        },
      });

      return res.status(200).json({
        success: true,
        message: `${memberToDelete.name} has been removed from your team`,
        data: { memberId },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action: 'developer_team_member_delete_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}