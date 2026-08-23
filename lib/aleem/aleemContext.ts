// lib/aleem/aleemContext.ts
// ALEEM - client page context: validation, server-side re-grounding, prompt block.
//
// SECURITY MODEL
// The browser may tell us WHICH page the user is on. It may never tell us WHAT
// IS TRUE about that page. Every factual value (price, area, type, society) is
// re-read from MongoDB through the canonical public-property filter, or it is
// dropped. Client-claimed facts are never echoed to the model or to the user.
//
// Deliberately NOT accepted from the client: price, bedrooms, bathrooms, area,
// nocStatus, overallScore, overallRiskLevel. Zod strips unknown keys, so even
// if the legacy widget still sends them they are discarded before use.

import { z } from 'zod';
import mongoose from 'mongoose';
import Property from '@/models/Property';
import {
  isPublicProperty,
  withPublicPropertyFilter,
} from '@/lib/property/publicProperty';

const CONTEXT_QUERY_MS = 2000;
const MAX_BLOCK_LENGTH = 1200;

// ---------------------------------------------------------------------------
// Schema - navigation hints only
// ---------------------------------------------------------------------------

export const AleemContextSchema = z.object({
  type: z.enum(['property', 'project', 'society', 'general']),
  id: z.string().max(64).optional(),
  slug: z.string().max(200).optional(),
  title: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  canonicalUrl: z.string().url().max(500).optional(),
});

export type AleemContextInput = z.infer<typeof AleemContextSchema>;

export interface ResolvedAleemContext {
  kind: 'property' | 'society' | 'project';
  verified: boolean;
  fingerprint: string;
  block: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Neutralise text that will be placed inside the model prompt. Titles and
 * society names come from user-submitted listings, so they are treated as
 * untrusted even after they have been read back from our own database.
 */
function safeLabel(value: unknown, max = 120): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t`]+/g, ' ')
    .replace(/\[\/?INST\]/gi, '')
    .replace(/<\|im_(start|end)\|>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/** Deterministic digit grouping - no ICU dependency, no rounding drift. */
function groupDigits(value: number): string {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function slugKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export function parseAleemContext(raw: unknown): AleemContextInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const parsed = AleemContextSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

interface LeanProperty {
  slug?: string;
  title?: string;
  city?: string;
  society?: string;
  propertyType?: string;
  listingType?: string;
  price?: number;
  area?: number;
  unit?: string;
  verification?: { status?: string | null } | null;
  isDeleted?: boolean | null;
  deletedAt?: Date | string | null;
  isFlagged?: boolean | null;
}

async function resolvePropertyContext(
  ctx: AleemContextInput,
): Promise<ResolvedAleemContext | null> {
  const query: Record<string, unknown> = {};

  if (ctx.slug && /^[A-Za-z0-9][A-Za-z0-9-]{0,199}$/.test(ctx.slug)) {
    query.slug = ctx.slug;
  } else if (ctx.id && mongoose.Types.ObjectId.isValid(ctx.id)) {
    query._id = new mongoose.Types.ObjectId(ctx.id);
  } else {
    return null;
  }

  const doc = await Property.findOne(withPublicPropertyFilter(query))
    .select(
      'slug title city society propertyType listingType price area unit ' +
        'verification isDeleted deletedAt isFlagged',
    )
    .maxTimeMS(CONTEXT_QUERY_MS)
    .lean<LeanProperty | null>()
    .exec();

  // Not found, unverified, flagged or deleted -> context is dropped entirely.
  if (!doc || !isPublicProperty(doc)) return null;

  const lines: string[] = [
    'The user is currently viewing this property page on Highrise.pk.',
    'The values below were re-read from the Highrise database during this request and are accurate:',
  ];

  const title = safeLabel(doc.title, 160);
  if (title) lines.push(`- Title: ${title}`);
  if (doc.slug) lines.push(`- Listing ref: ${safeLabel(doc.slug, 200)}`);

  const city = safeLabel(doc.city);
  if (city) lines.push(`- City: ${city}`);

  const society = safeLabel(doc.society);
  if (society) lines.push(`- Society: ${society}`);

  const propertyType = safeLabel(doc.propertyType, 60);
  if (propertyType) lines.push(`- Property type: ${propertyType}`);

  const listingType = safeLabel(doc.listingType, 40);
  if (listingType) lines.push(`- Listing type: ${listingType}`);

  if (typeof doc.price === 'number' && doc.price > 0) {
    lines.push(`- Asking price on record: PKR ${groupDigits(doc.price)}`);
  }

  if (typeof doc.area === 'number' && doc.area > 0) {
    const unit = safeLabel(doc.unit, 20);
    lines.push(`- Area on record: ${doc.area}${unit ? ` ${unit}` : ''}`);
  }

  lines.push(
    'Rules for this context:',
    '- You may discuss this specific property and give your honest opinion about it.',
    '- Quote the price and area EXACTLY as written above. Never round them, never convert them to Lakh or Crore, never restate them approximately.',
    '- Do not state any figure about this property that is not listed above.',
    '- Verified means Highrise reviewed the submitted evidence. It is NOT a guarantee of legal title.',
  );

  return {
    kind: 'property',
    verified: true,
    fingerprint: `ctx:property:${slugKey(doc.slug ?? String(query._id ?? ''))}`,
    block: lines.join('\n').slice(0, MAX_BLOCK_LENGTH),
  };
}

function resolveNavigationContext(
  ctx: AleemContextInput,
  kind: 'society' | 'project',
): ResolvedAleemContext | null {
  const name = safeLabel(ctx.title, 160);
  if (!name) return null;

  const label = kind === 'society' ? 'Society' : 'Project';
  const city = safeLabel(ctx.city);

  const lines = [
    `The user is currently viewing a ${kind} page on Highrise.pk.`,
    `${label} name shown on the page (UNVERIFIED page label): ${name}`,
  ];
  if (city) lines.push(`City shown on the page (UNVERIFIED page label): ${city}`);

  lines.push(
    'Rules for this context:',
    `- This is navigation context only. It has NOT been checked against the Highrise database.`,
    `- Do NOT state prices, NOC status, approval status, risk scores, ratings or any other factual claim about this ${kind}.`,
    '- You may explain generally how to evaluate this kind of page, what to verify, and what red flags to look for.',
    '- If the user asks for specific facts, tell them the verified data is shown on the page itself, or offer to search verified listings.',
  );

  const key = slugKey(ctx.slug ?? name);

  return {
    kind,
    verified: false,
    fingerprint: `ctx:${kind}:${key}`,
    block: lines.join('\n').slice(0, MAX_BLOCK_LENGTH),
  };
}

/**
 * Turn a validated client context into a server-controlled prompt block.
 * Returns null when there is nothing trustworthy to say.
 */
export async function resolveAleemContext(
  ctx: AleemContextInput | null,
): Promise<ResolvedAleemContext | null> {
  if (!ctx || ctx.type === 'general') return null;
  if (ctx.type === 'property') return resolvePropertyContext(ctx);
  if (ctx.type === 'society') return resolveNavigationContext(ctx, 'society');
  if (ctx.type === 'project') return resolveNavigationContext(ctx, 'project');
  return null;
}
