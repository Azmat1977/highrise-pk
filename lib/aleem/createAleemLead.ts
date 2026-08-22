// lib/aleem/createAleemLead.ts
// ALEEM — consent → callback lead.
//
// Creates a Lead when a user says "yes, arrange a callback" after being
// shown grounded listings. Routed to the seller/sales queue as a handoff —
// NO fund custody (SAFEDEAL conversion is a queue, not escrow).

import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Property from '@/models/Property';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const MAX_LISTINGS = 8;

export interface CreateAleemLeadResult {
  success: boolean;
  leadId?: string;
  listingCount?: number;
  code?: 'PHONE_NOT_VERIFIED' | 'NO_LISTINGS';
}

/**
 * Validate the client-supplied `lastListings` (an array of property slugs the
 * widget showed in the previous turn). Dedupes, enforces shape and cap.
 * Returns an empty array for anything malformed.
 */
export function validateListingSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const s = item.trim();
    if (!s || !SLUG_PATTERN.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_LISTINGS) break;
  }
  return out;
}

const STRONG_CONSENT = /\b(arrange|callback|call back|call me|contact me|call karein|rabta karein|reach out|connect me)\b/i;
const SHORT_AFFIRM = /^(yes|yeah|yep|haan|han|ji|ji haan|theek hai|ok|okay|bilkul|zaroor|sure|please|confirm)\b/i;

/**
 * Detect a callback consent signal in the user's message.
 * Strong signals (arrange/callback/contact) count on any message; a bare
 * affirmative ("yes"/"haan"/"ok") counts only when the message is short,
 * i.e. a direct answer to "should I arrange a callback?".
 */
export function detectConsent(message: string): boolean {
  const m = message.trim();
  if (STRONG_CONSENT.test(m)) return true;
  return m.length <= 40 && SHORT_AFFIRM.test(m);
}

/**
 * Create a `call_back` lead for the listings the user was shown.
 * Resolves slugs against the canonical public filter so a stale/unverified
 * listing can never enter the CRM.
 */
export async function createAleemLead(
  userId: string,
  listingSlugs: string[],
): Promise<CreateAleemLeadResult> {
  await dbConnect();

  const user = await User.findById(userId).lean();
  if (!user || !user.phone || !user.isPhoneVerified) {
    return { success: false, code: 'PHONE_NOT_VERIFIED' };
  }

  const properties = await Property.find({
    ...PUBLIC_PROPERTY_FILTER,
    slug: { $in: listingSlugs },
  })
    .select('slug title city society price propertyType listingType images')
    .limit(MAX_LISTINGS)
    .maxTimeMS(2500)
    .lean();

  if (properties.length === 0) {
    return { success: false, code: 'NO_LISTINGS' };
  }

  const slugs = properties.map((p) => String((p as { slug?: string }).slug));
  const snapshots = properties.map((p: any) => ({
    _id: p._id,
    title: p.title,
    slug: p.slug,
    city: p.city,
    society: p.society,
    price: p.price,
    propertyType: p.propertyType,
    listingType: p.listingType,
    primaryImage: p.images?.[0]?.url,
  }));

  const lead = await Lead.create({
    name: user.name,
    email: user.email,
    phone: user.phone,
    leadType: 'call_back',
    entityType: 'property',
    source: 'aleem_chat',
    status: 'new',
    // Property slugs shown to the user this turn (public identifier).
    listingIds: slugs,
    propertySnapshot: snapshots[0],
    notes:
      `[ALEEM] Callback requested via grounded AI search (${slugs.length} listing(s)). ` +
      `Routed to sales/seller queue — no fund custody. Shown slugs: ${slugs.join(', ')}`,
    tags: ['aleem_chat', 'callback', 'grounded_search'],
  });

  return {
    success: true,
    leadId: String(lead._id),
    listingCount: slugs.length,
  };
}
