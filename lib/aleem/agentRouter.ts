// lib/aleem/agentRouter.ts
// 🎯 ENTERPRISE AGENT LEAD ROUTING ENGINE - HIGHRISE.PK
// Automatically matches and routes callback leads to regional verified agents.

import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Lead from '@/models/Lead';
import { notifyAgentNewLead } from '@/lib/email';
import mongoose from 'mongoose';

export interface RouteLeadOptions {
  leadId: string;
  propertyCity?: string;
  propertySociety?: string;
  propertyTitle?: string;
  propertyPrice?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  intent?: string;
  message?: string;
}

export interface RoutingResult {
  assigned: boolean;
  agentId?: string;
  agentName?: string;
  agentEmail?: string;
  matchTier?: 'area_match' | 'city_match' | 'none';
}

/**
 * Escapes regex special characters to prevent ReDoS / query injection.
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Routes a newly captured lead to the most relevant regional agent.
 * Fire-and-forget safe — never throws or crashes caller flow.
 */
export async function routeLeadToRegionalAgent(
  options: RouteLeadOptions,
): Promise<RoutingResult> {
  try {
    const {
      leadId,
      propertyCity,
      propertySociety,
      propertyTitle,
      propertyPrice,
      customerName,
      customerPhone,
      customerEmail,
      intent,
      message,
    } = options;

    if (!leadId || !propertyCity) {
      return { assigned: false, matchTier: 'none' };
    }

    await dbConnect();

    const cityRegex = new RegExp(`^${escapeRegex(propertyCity.trim())}$`, 'i');

    // Base query for active real estate agents
    const baseAgentFilter = {
      $or: [{ role: 'agent' }, { isVerifiedAgent: true }, { profession: 'agent' }],
      status: 'active',
      isDeleted: { $ne: true },
      city: cityRegex,
    };

    let assignedAgent: any = null;
    let matchTier: 'area_match' | 'city_match' | 'none' = 'none';

    // ─── TIER 1: Exact Society / Dealing Area Match ───
    if (propertySociety && propertySociety.trim().length > 0) {
      const societyRegex = new RegExp(escapeRegex(propertySociety.trim()), 'i');
      
      const areaMatches = await User.find({
        ...baseAgentFilter,
        dealingAreas: { $elemMatch: { $regex: societyRegex } },
      })
        .select('_id name email phone averageRating totalReviews')
        .sort({ averageRating: -1, totalReviews: -1, updatedAt: -1 })
        .limit(5)
        .lean();

      if (areaMatches.length > 0) {
        // Fair distribution among top matched agents
        const randomIndex = Math.floor(Math.random() * areaMatches.length);
        assignedAgent = areaMatches[randomIndex];
        matchTier = 'area_match';
      }
    }

    // ─── TIER 2: City-wide Fallback ───
    if (!assignedAgent) {
      const cityMatches = await User.find(baseAgentFilter)
        .select('_id name email phone averageRating totalReviews')
        .sort({ averageRating: -1, totalReviews: -1, updatedAt: -1 })
        .limit(5)
        .lean();

      if (cityMatches.length > 0) {
        const randomIndex = Math.floor(Math.random() * cityMatches.length);
        assignedAgent = cityMatches[randomIndex];
        matchTier = 'city_match';
      }
    }

    // If no regional agent exists for this city, exit cleanly (Admin will handle)
    if (!assignedAgent || !assignedAgent.email) {
      return { assigned: false, matchTier: 'none' };
    }

    // ─── Update the Lead Document ───
    const agentObjectId = new mongoose.Types.ObjectId(String(assignedAgent._id));
    const routingNote = `[Auto-Router] Assigned to ${assignedAgent.name} (${assignedAgent.email}) via ${
      matchTier === 'area_match' ? 'Society Match (' + propertySociety + ')' : 'City Coverage (' + propertyCity + ')'
    }.`;

    await Lead.findByIdAndUpdate(leadId, {
      $set: {
        assignedTo: assignedAgent.email,
        assignedToUserId: agentObjectId,
        assignedToRole: 'agent',
      },
      $push: {
        timeline: {
          action: 'Lead Assigned to Agent',
          performedBy: 'ALEEM Lead Router',
          performedByRole: 'system',
          timestamp: new Date(),
          notes: routingNote,
          metadata: {
            agentId: assignedAgent._id,
            matchTier,
            city: propertyCity,
            society: propertySociety,
          },
        },
      },
    });

    // ─── Fire Notification Email to the Assigned Agent ───
    void notifyAgentNewLead(
      {
        name: assignedAgent.name || 'Agent',
        email: assignedAgent.email,
      },
      {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        intent,
        message,
        propertyTitle,
        propertyCity,
        propertySociety,
        propertyPrice,
        leadId,
      },
    ).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[notifyAgentNewLead failed]:', err);
      }
    });

    return {
      assigned: true,
      agentId: String(assignedAgent._id),
      agentName: assignedAgent.name,
      agentEmail: assignedAgent.email,
      matchTier,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[routeLeadToRegionalAgent error]:', error);
    }
    return { assigned: false, matchTier: 'none' };
  }
}