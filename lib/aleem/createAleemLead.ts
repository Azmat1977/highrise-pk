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
import { notifyAdminNewLead } from '@/lib/email';
import { routeLeadToRegionalAgent } from '@/lib/aleem/agentRouter';

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

  // Fire-and-forget admin email notification (never blocks customer response)
  const firstSnap = snapshots[0] as Record<string, any> | undefined;
  void notifyAdminNewLead({
    name: user.name ?? 'Registered User',
    phone: user.phone ?? 'N/A',
    email: user.email,
    intent: 'callback',
    leadType: 'call_back',
    source: 'aleem_chat (grounded search)',
    propertyTitle: firstSnap?.title,
    propertyCity: firstSnap?.city,
    propertySociety: firstSnap?.society,
    propertyPrice: firstSnap?.price,
    phoneVerified: true,
    isGuest: false,
    leadId: String(lead._id),
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[notifyAdminNewLead failed]:', err);
    }
  });

  // Fire-and-forget regional agent routing & notification
  void routeLeadToRegionalAgent({
    leadId: String(lead._id),
    propertyCity: firstSnap?.city,
    propertySociety: firstSnap?.society,
    propertyTitle: firstSnap?.title,
    propertyPrice: firstSnap?.price,
    customerName: user.name ?? 'Registered User',
    customerPhone: user.phone ?? '',
    customerEmail: user.email,
    intent: 'callback',
    message: `Grounded search callback for ${slugs.join(', ')}`,
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[routeLeadToRegionalAgent failed]:', err);
    }
  });

  return {
    success: true,
    leadId: String(lead._id),
    listingCount: slugs.length,
  };
}

// EXPERT CALLBACK LEAD
// Replaces the legacy /api/aria/leads path so Highrise has ONE lead system.
//
// Differences from createAleemLead():
//   - Works for guests. Most first-time enquiries have no account yet, and
//     blocking them would close the funnel entirely.
//   - Takes the phone from the form, and records honestly whether it has been
//     verified so the sales team knows what they are calling.
//
// Deliberately NOT copied from the legacy endpoint:
//   - No fabricated snapshot values ("city: Unknown", "price: 0").
//   - No synthetic email address. An absent email stays absent.
//   - No callback timing promise anywhere.

const PK_PHONE = /^(?:\+?92|0092|0)?[\s-]?3\d{2}[\s-]?\d{7}$/;
const MAX_NAME = 80;
const MAX_MESSAGE = 500;

export type ExpertLeadIntent = 'buy' | 'rent' | 'invest' | 'verify';

export interface CreateExpertLeadInput {
  name: string;
  phone: string;
  email?: string;
  intent?: ExpertLeadIntent;
  message?: string;
  /** Public slug of the page the user was on, when it is a property page. */
  propertySlug?: string;
  /** Authenticated user id, when signed in. */
  userId?: string;
  sessionId?: string;
}

export interface CreateExpertLeadResult {
  success: boolean;
  leadId?: string;
  code?: 'INVALID_NAME' | 'INVALID_PHONE' | 'FAILED';
}

/** Normalise any Pakistani mobile format to local 03XXXXXXXXX. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let local: string | null = null;
  if (digits.startsWith('0092') && digits.length === 14) local = `0${digits.slice(4)}`;
  else if (digits.startsWith('92') && digits.length === 12) local = `0${digits.slice(2)}`;
  else if (digits.startsWith('03') && digits.length === 11) local = digits;
  else if (digits.startsWith('3') && digits.length === 10) local = `0${digits}`;
  return local && /^03\d{9}$/.test(local) ? local : null;
}

function cleanText(value: string | undefined, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

const INTENT_TO_LEAD_TYPE: Record<ExpertLeadIntent, string> = {
  buy: 'property_inquiry',
  rent: 'rent_inquiry',
  invest: 'project_interest',
  verify: 'general_inquiry',
};

interface LeanProperty {
  _id: unknown;
  slug?: string;
  title?: string;
  city?: string;
  society?: string;
  price?: number;
  propertyType?: string;
  listingType?: string;
}

/**
 * Create an expert callback lead from the in-chat form.
 * Guests are allowed; the record states plainly whether the phone is verified.
 */
export async function createExpertLead(
  input: CreateExpertLeadInput,
): Promise<CreateExpertLeadResult> {
  const name = cleanText(input.name, MAX_NAME);
  if (!name || name.length < 2) return { success: false, code: 'INVALID_NAME' };

  if (!PK_PHONE.test(input.phone.trim())) {
    return { success: false, code: 'INVALID_PHONE' };
  }
  const formPhone = normalizePhone(input.phone);
  if (!formPhone) return { success: false, code: 'INVALID_PHONE' };

  await dbConnect();

  // Prefer a verified number on file over anything typed into a form.
  let phone = formPhone;
  let phoneVerified = false;
  let email = cleanText(input.email, 254)?.toLowerCase();
  let accountName: string | undefined;

  if (input.userId) {
    try {
      const user = await User.findById(input.userId)
        .select('name email phone isPhoneVerified')
        .lean<{
          name?: string;
          email?: string;
          phone?: string;
          isPhoneVerified?: boolean;
        } | null>();

      if (user) {
        accountName = user.name;
        if (!email && user.email) email = user.email.toLowerCase();
        if (user.phone && user.isPhoneVerified) {
          phone = user.phone;
          phoneVerified = true;
        }
      }
    } catch {
      // Account lookup failed; continue with the form values.
    }
  }

  // Re-read the property server side. Never trust a client-supplied snapshot,
  // and never invent placeholder values for fields we do not have.
  let snapshot: Record<string, unknown> | undefined;
  let propertyId: unknown;

  if (input.propertySlug && /^[a-z0-9-]{1,120}$/.test(input.propertySlug)) {
    try {
      const doc = await Property.findOne({
        ...PUBLIC_PROPERTY_FILTER,
        slug: input.propertySlug,
      })
        .select('slug title city society price propertyType listingType')
        .maxTimeMS(2000)
        .lean<LeanProperty | null>();

      if (doc) {
        propertyId = doc._id;
        snapshot = {
          _id: doc._id,
          title: doc.title,
          slug: doc.slug,
          city: doc.city,
          society: doc.society,
          price: doc.price,
          propertyType: doc.propertyType,
          listingType: doc.listingType,
        };
      }
    } catch {
      // Property lookup failed; the lead is still worth creating.
    }
  }

  const intent: ExpertLeadIntent = input.intent ?? 'buy';
  const message = cleanText(input.message, MAX_MESSAGE);

  const verificationNote = phoneVerified
    ? 'Phone verified on the Highrise account.'
    : 'Phone entered in the chat form and NOT verified. Confirm identity on the call.';

  try {
    const lead = await Lead.create({
      name: accountName && phoneVerified ? accountName : name,
      // No synthetic address: an absent email stays absent.
      ...(email ? { email } : {}),
      phone,

      leadType: INTENT_TO_LEAD_TYPE[intent],
      entityType: 'property',
      source: 'aleem_chat',
      status: 'new',

      ...(message ? { message } : {}),
      ...(propertyId ? { property: propertyId } : {}),
      ...(snapshot ? { propertySnapshot: snapshot } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),

      notes:
        `[ALEEM] Expert callback requested from chat. Intent: ${intent}. ` +
        `${verificationNote} No fund custody - sales/seller handoff only.`,

      tags: [
        'aleem_chat',
        'expert_callback',
        phoneVerified ? 'phone_verified' : 'phone_unverified',
        input.userId ? 'registered_user' : 'guest',
      ],
    });

    // Fire-and-forget admin email notification (never blocks customer response)
    const snap = snapshot as Record<string, any> | undefined;
    void notifyAdminNewLead({
      name: accountName && phoneVerified ? accountName : name,
      phone,
      email,
      intent,
      message,
      leadType: INTENT_TO_LEAD_TYPE[intent],
      source: 'aleem_chat (expert form)',
      propertyTitle: snap?.title,
      propertyCity: snap?.city,
      propertySociety: snap?.society,
      propertyPrice: snap?.price,
      phoneVerified,
      isGuest: !input.userId,
      leadId: String(lead._id),
    }).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[notifyAdminNewLead failed]:', err);
      }
    });

    // Fire-and-forget regional agent routing & notification
    void routeLeadToRegionalAgent({
      leadId: String(lead._id),
      propertyCity: snap?.city,
      propertySociety: snap?.society,
      propertyTitle: snap?.title,
      propertyPrice: snap?.price,
      customerName: accountName && phoneVerified ? accountName : name,
      customerPhone: phone,
      customerEmail: email,
      intent,
      message,
    }).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[routeLeadToRegionalAgent failed]:', err);
      }
    });

    return { success: true, leadId: String(lead._id) };
  } catch {
    return { success: false, code: 'FAILED' };
  }
}