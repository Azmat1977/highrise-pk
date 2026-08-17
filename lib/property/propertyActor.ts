//C:\dev\highrise-pk\lib\property\propertyActor.ts
import type { Types } from 'mongoose';
import AgentProfile from '@/models/AgentProfile';
import DeveloperProfile from '@/models/DeveloperProfile';
import User from '@/models/User';

export type PropertyActorRole = 'developer' | 'agent' | 'owner';
export interface PublicPropertyActor {
  role: PropertyActorRole;
  label: 'Developer' | 'Agent' | 'Owner';
  displayName: string;
  profileSlug?: string;
  profileImageUrl?: string;
  verified: boolean;
}
export interface PropertyActorResolution extends PublicPropertyActor {
  userId: string;
}

interface PropertyActorInput {
  owner?: Types.ObjectId | string | null;
  agentId?: Types.ObjectId | string | null;
  developerId?: Types.ObjectId | string | null;
}

export async function resolvePropertyActor(property: PropertyActorInput): Promise<PropertyActorResolution | null> {
  // Explicit persisted relationships have precedence. An inactive explicit relationship
  // fails closed instead of silently routing a buyer to somebody else.
  if (property.developerId) {
    const profile = await DeveloperProfile.findOne({ _id: property.developerId, status: 'approved', isDeleted: { $ne: true } })
      .select('user companyName slug logoUrl isVerified').lean<Record<string, unknown>>();
    if (!profile?.user) return null;
    const user = await User.findOne({ _id: profile.user, status: 'active', isDeleted: { $ne: true } }).select('_id').lean();
    if (!user) return null;
    return {
      role: 'developer', label: 'Developer', userId: String(profile.user),
      displayName: String(profile.companyName || 'Verified Developer'),
      profileSlug: profile.slug ? String(profile.slug) : undefined,
      profileImageUrl: profile.logoUrl ? String(profile.logoUrl) : undefined,
      verified: profile.isVerified === true || String(profile.status) === 'approved',
    };
  }

  if (property.agentId) {
    const profile = await AgentProfile.findOne({ _id: property.agentId, status: 'approved', isDeleted: { $ne: true } })
      .select('user name displayName agencyName slug profilePictureUrl isVerified verificationLevel').lean<Record<string, unknown>>();
    if (!profile?.user) return null;
    const user = await User.findOne({ _id: profile.user, status: 'active', isDeleted: { $ne: true } }).select('_id').lean();
    if (!user) return null;
    return {
      role: 'agent', label: 'Agent', userId: String(profile.user),
      displayName: String(profile.displayName || profile.name || profile.agencyName || 'Verified Agent'),
      profileSlug: profile.slug ? String(profile.slug) : undefined,
      profileImageUrl: profile.profilePictureUrl ? String(profile.profilePictureUrl) : undefined,
      verified: profile.isVerified === true || String(profile.verificationLevel || '').length > 0,
    };
  }

  if (!property.owner) return null;
  const owner = await User.findOne({ _id: property.owner, status: 'active', isDeleted: { $ne: true } })
    .select('_id name displayName profilePictureUrl isVerified kycVerified').lean<Record<string, unknown>>();
  if (!owner?._id) return null;
  return {
    role: 'owner', label: 'Owner', userId: String(owner._id),
    displayName: String(owner.displayName || owner.name || 'Property Owner'),
    profileImageUrl: owner.profilePictureUrl ? String(owner.profilePictureUrl) : undefined,
    verified: owner.kycVerified === true || owner.isVerified === true,
  };
}

export function publicPropertyActor(actor: PropertyActorResolution | null): PublicPropertyActor | null {
  if (!actor) return null;
  const { userId: _userId, ...safe } = actor;
  return safe;
}
