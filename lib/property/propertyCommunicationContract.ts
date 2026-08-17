/**
 * Highrise.pk — Property WP8 communication contract
 *
 * Client input is intentionally narrow. Recipient identity, sender account data,
 * Property publication state and Property snapshot data are server-owned.
 */

export const PROPERTY_COMMUNICATION_INTENTS = [
  'inquiry',
  'callback',
  'site_visit',
] as const;

export type PropertyCommunicationIntent =
  (typeof PROPERTY_COMMUNICATION_INTENTS)[number];

export type CanonicalPropertyLeadType =
  | 'property_inquiry'
  | 'call_back'
  | 'site_visit';

export interface PropertyCommunicationInput {
  intent: PropertyCommunicationIntent;
  message?: string;
  preferredVisitAt?: string;
}

export interface ParsedPropertyCommunicationInput {
  intent: PropertyCommunicationIntent;
  leadType: CanonicalPropertyLeadType;
  message: string;
  preferredVisitAt: Date | null;
}

export type PropertyCommunicationValidationResult =
  | { ok: true; value: ParsedPropertyCommunicationInput }
  | { ok: false; code: 'INVALID_INPUT'; message: string };

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_VISIT_DAYS_AHEAD = 180;
const CLIENT_KEYS = new Set(['intent', 'message', 'preferredVisitAt']);

export const RECIPIENT_CONTROLLED_KEYS = [
  'recipientUserId',
  'assignedToUserId',
  'assignedToRole',
  'ownerId',
  'agentId',
  'developerId',
  'developer',
  'assignedTo',
] as const;

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').trim();
}

export function mapIntentToLeadType(
  intent: PropertyCommunicationIntent,
): CanonicalPropertyLeadType {
  switch (intent) {
    case 'callback':
      return 'call_back';
    case 'site_visit':
      return 'site_visit';
    case 'inquiry':
    default:
      return 'property_inquiry';
  }
}

export function hasRecipientOverrideAttempt(
  payload: Record<string, unknown>,
): boolean {
  return RECIPIENT_CONTROLLED_KEYS.some((key) => key in payload);
}

export function hasUnexpectedClientKeys(
  payload: Record<string, unknown>,
): boolean {
  return Object.keys(payload).some((key) => !CLIENT_KEYS.has(key));
}

export function parsePropertyCommunicationInput(
  input: unknown,
  now: Date = new Date(),
): PropertyCommunicationValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Invalid request body.' };
  }

  const payload = input as Record<string, unknown>;

  if (hasRecipientOverrideAttempt(payload)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: 'Recipient fields are server controlled.',
    };
  }

  if (hasUnexpectedClientKeys(payload)) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: 'Request contains unsupported fields.',
    };
  }

  const intentRaw = normalizeText(payload.intent).toLowerCase();
  if (!PROPERTY_COMMUNICATION_INTENTS.includes(intentRaw as PropertyCommunicationIntent)) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Invalid inquiry type.' };
  }

  const intent = intentRaw as PropertyCommunicationIntent;
  const message = normalizeText(payload.message);

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  let preferredVisitAt: Date | null = null;
  const visitRaw = normalizeText(payload.preferredVisitAt);

  if (intent === 'site_visit') {
    if (!visitRaw) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: 'Please choose a preferred visit date and time.',
      };
    }

    const parsed = new Date(visitRaw);
    if (Number.isNaN(parsed.getTime())) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: 'Preferred visit date is invalid.',
      };
    }

    const maxDate = new Date(now.getTime() + MAX_VISIT_DAYS_AHEAD * 86_400_000);
    if (parsed.getTime() <= now.getTime() || parsed.getTime() > maxDate.getTime()) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        message: `Visit time must be in the future and within ${MAX_VISIT_DAYS_AHEAD} days.`,
      };
    }

    preferredVisitAt = parsed;
  } else if (visitRaw) {
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: 'Visit time is only accepted for a site-visit request.',
    };
  }

  return {
    ok: true,
    value: {
      intent,
      leadType: mapIntentToLeadType(intent),
      message,
      preferredVisitAt,
    },
  };
}
