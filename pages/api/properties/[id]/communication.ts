//C:\dev\highrise-pk\pages\api\properties\[id]\communication.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import Lead from "@/models/Lead";
import DeveloperProfile from "@/models/DeveloperProfile";
import AgentProfile from "@/models/AgentProfile";
import User from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitInquiry } from "@/lib/rateLimit";
import { PUBLIC_PROPERTY_FILTER } from "@/lib/property/publicProperty";
import { parsePropertyCommunicationInput } from "@/lib/property/propertyCommunicationContract";
import {
  resolvePropertyLeadRecipient,
  type PropertyRecipientAccount,
  type PropertyRecipientProperty,
} from "@/lib/property/propertyLeadRecipient";
import { buildCanonicalPropertyLead } from "@/lib/property/propertyCommunicationService";

async function activeUser(userId: unknown) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return null;
  return User.findOne({ _id: userId, status: "active", isDeleted: { $ne: true } })
    .select("_id name displayName email phone")
    .lean<Record<string, unknown> | null>();
}

async function developerRecipient(property: PropertyRecipientProperty): Promise<PropertyRecipientAccount | null> {
  if (!property.developerId) return null;
  const profile = await DeveloperProfile.findOne({ _id: property.developerId })
    .select("user companyName status isDeleted")
    .lean<Record<string, unknown> | null>();
  const user = profile?.user ? await activeUser(profile.user) : null;
  if (!profile?.user) return null;
  return {
    userId: String(profile.user), role: "developer",
    displayName: String(profile.companyName || user?.displayName || user?.name || "Developer"),
    active: Boolean(user && profile.status === "approved" && profile.isDeleted !== true),
    source: "developer_relationship",
  };
}

async function agentRecipient(property: PropertyRecipientProperty): Promise<PropertyRecipientAccount | null> {
  if (!property.agentId) return null;
  const profile = await AgentProfile.findOne({ _id: property.agentId })
    .select("user displayName name agencyName status isDeleted")
    .lean<Record<string, unknown> | null>();
  const user = profile?.user ? await activeUser(profile.user) : null;
  if (!profile?.user) return null;
  return {
    userId: String(profile.user), role: "agent",
    displayName: String(profile.displayName || profile.name || profile.agencyName || user?.displayName || user?.name || "Agent"),
    active: Boolean(user && profile.status === "approved" && profile.isDeleted !== true),
    source: "agent_relationship",
  };
}

async function ownerRecipient(property: PropertyRecipientProperty): Promise<PropertyRecipientAccount | null> {
  const ownerId = property.ownerId || property.createdBy || property.userId;
  const user = await activeUser(ownerId);
  if (!ownerId) return null;
  return {
    userId: String(ownerId), role: "owner",
    displayName: String(user?.displayName || user?.name || "Property Owner"),
    active: Boolean(user), source: "owner_relationship",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const rl = await rateLimitInquiry(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rawId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!rawId) {
    return res.status(400).json({ success: false, message: "Invalid Property ID" });
  }

  const parsed = parsePropertyCommunicationInput(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, code: parsed.code, message: parsed.message });

  await dbConnect();

  const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
  const query = isObjectId ? { _id: rawId } : { slug: rawId };

  const property = await Property.findOne({ ...query, isDeleted: { $ne: true } })
    .select("_id title price city locality society slug owner agentId developerId isFlagged")
    .lean<Record<string, unknown> | null>();

  if (!property) return res.status(404).json({ success: false, message: "Property is not currently available for inquiries." });

  if (property.isFlagged) {
    return res.status(403).json({ success: false, message: "This listing is under review due to reports." });
  }

  const propertyId = String(property._id);

  const recipientProperty: PropertyRecipientProperty = {
    id: propertyId,
    developerId: property.developerId ? String(property.developerId) : null,
    agentId: property.agentId ? String(property.agentId) : null,
    ownerId: property.owner ? String(property.owner) : null,
  };
  const resolution = await resolvePropertyLeadRecipient(recipientProperty, {
    resolveDeveloper: developerRecipient,
    resolveAgent: agentRecipient,
    resolveOwner: ownerRecipient,
  });
  if (!resolution.ok) return res.status(409).json({ success: false, code: resolution.code, message: resolution.message });

  const built = buildCanonicalPropertyLead(
    {
      id: propertyId,
      title: String(property.title || "Property"),
      price: typeof property.price === "number" ? property.price : undefined,
      city: typeof property.city === "string" ? property.city : undefined,
      locality: typeof property.locality === "string" ? property.locality : typeof property.society === "string" ? property.society : undefined,
      slug: typeof property.slug === "string" ? property.slug : undefined,
      publicEligible: true,
    },
    {
      userId: auth.id,
      name: auth.name || auth.displayName || "",
      email: auth.email || "",
      phone: auth.phone || auth.phoneNumber || "",
      active: true,
    },
    resolution.recipient,
    parsed.value,
  );
  if (!built.ok) return res.status(400).json({ success: false, code: built.code, message: built.message });

  const lead = await Lead.create({
    ...built.lead,
    assignedToUserId: new mongoose.Types.ObjectId(built.lead.assignedToUserId),
    assignedTo: "",
    property: new mongoose.Types.ObjectId(propertyId),
    propertySnapshot: {
      _id: new mongoose.Types.ObjectId(propertyId),
      title: built.lead.propertySnapshot.title,
      slug: built.lead.propertySnapshot.slug,
      city: built.lead.propertySnapshot.city,
      locality: built.lead.propertySnapshot.locality,
      price: built.lead.propertySnapshot.price,
    },
    status: "new",
  });

  await Property.updateOne({ _id: propertyId, ...PUBLIC_PROPERTY_FILTER }, { $inc: { inquiryCount: 1 } }).catch(() => undefined);

  return res.status(201).json({
    success: true,
    message: "Your request has been sent to the accountable listing representative.",
    data: { leadId: String(lead._id), status: lead.status, recipientRole: resolution.recipient.role },
  });
}
