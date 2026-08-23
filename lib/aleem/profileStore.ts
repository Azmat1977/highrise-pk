// lib/aleem/profileStore.ts
// ALEEM - safe storage encoding for contact details captured mid-chat.
//
// Wraps lib/kycCrypto so chat can reuse the platform's AES-256-GCM pipeline
// (encrypt at rest, hash for lookup, mask for display) WITHOUT inheriting its
// failure modes. kycEncrypt() throws when KYC_ENC_KEY is absent and
// assertValidPhone() throws on an unexpected format - neither may ever cost a
// customer their reply, so every call here is individually guarded.
//
// Failure policy: if a field cannot be encoded, that field is silently
// dropped. Chat continues. We never store plaintext PII as a "fallback".

import {
  processPhoneForStorage,
  kycEncrypt,
  hashForLogging,
  maskEmail,
} from '@/lib/kycCrypto';
import type { ExtractedProfile, ProfileField } from '@/lib/aleem/extractProfile';

export interface StoredProfileFields {
  name?: string;
  city?: string;
  phoneEncrypted?: string;
  phoneHash?: string;
  phoneMasked?: string;
  emailEncrypted?: string;
  emailHash?: string;
  emailMasked?: string;
  capturedAt?: Date;
}

export interface EncodeProfileResult {
  fields: StoredProfileFields;
  encoded: ProfileField[];
  masked: Partial<Record<ProfileField, string>>;
}

const MAX_NAME = 60;
const MAX_CITY = 100;

/**
 * Encode newly captured fields for persistence. Only the fields supplied are
 * returned; anything that fails encryption is omitted rather than stored raw.
 */
export function encodeProfileForStorage(
  profile: ExtractedProfile,
): EncodeProfileResult {
  const fields: StoredProfileFields = {};
  const encoded: ProfileField[] = [];
  const masked: Partial<Record<ProfileField, string>> = {};

  // Name and city are not sensitive identifiers - stored as plain text.
  if (profile.name) {
    fields.name = profile.name.slice(0, MAX_NAME);
    encoded.push('name');
    masked.name = fields.name;
  }

  if (profile.city) {
    fields.city = profile.city.slice(0, MAX_CITY);
    encoded.push('city');
    masked.city = fields.city;
  }

  // Phone: encrypted + hashed + masked via the platform KYC pipeline.
  if (profile.phone) {
    try {
      const result = processPhoneForStorage(profile.phone);
      fields.phoneEncrypted = result.encrypted;
      fields.phoneHash = result.hash;
      fields.phoneMasked = result.masked;
      encoded.push('phone');
      masked.phone = result.masked;
    } catch {
      // Missing key or unexpected format - drop the field, never store raw.
    }
  }

  // Email: no processEmailForStorage helper exists, so compose the same shape.
  if (profile.email) {
    try {
      fields.emailEncrypted = kycEncrypt(profile.email);
      fields.emailHash = hashForLogging(profile.email);
      fields.emailMasked = maskEmail(profile.email);
      encoded.push('email');
      masked.email = fields.emailMasked;
    } catch {
      // Drop the field rather than persist a readable address.
    }
  }

  if (encoded.length > 0) {
    fields.capturedAt = new Date();
  }

  return { fields, encoded, masked };
}

/**
 * Short, honest acknowledgement appended to ALEEM's reply when a detail is
 * captured. The operator chose transparent capture: the user is told what was
 * noted, using the MASKED value so a full number is never echoed back into the
 * transcript. Returns an empty string when there is nothing to acknowledge.
 */
export function buildCaptureAcknowledgement(
  encoded: ProfileField[],
  masked: Partial<Record<ProfileField, string>>,
): string {
  const parts: string[] = [];

  if (encoded.includes('name') && masked.name) {
    parts.push(`your name (${masked.name})`);
  }
  if (encoded.includes('city') && masked.city) {
    parts.push(`your city (${masked.city})`);
  }
  if (encoded.includes('phone') && masked.phone) {
    parts.push(`your number (${masked.phone})`);
  }
  if (encoded.includes('email') && masked.email) {
    parts.push(`your email (${masked.email})`);
  }

  if (parts.length === 0) return '';

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

  return (
    `\n\n_Noted ${list} for this conversation. ` +
    `Nobody will contact you unless you ask us to._`
  );
}

/**
 * Server-controlled nudge appended to the model prompt. Encourages ALEEM to
 * earn ONE missing detail naturally. It never instructs the model to invent
 * urgency, promise a callback time, or present a form.
 */
export function buildProfileNudge(
  missing: ProfileField[],
  turnCount: number,
): string {
  // Stay quiet early: rapport first, questions later.
  if (turnCount < 2 || missing.length === 0) return '';

  const next = missing[0];

  const guidance: Record<ProfileField, string> = {
    city:
      'You do not know which city the user is interested in. Ask naturally, ' +
      'as part of understanding their requirement.',
    name:
      'You do not know the user name yet. If the conversation is going well, ' +
      'ask politely what you should call them. Do not insist.',
    phone:
      'You do not have a contact number. Only ask if there is a concrete ' +
      'reason - for example offering to send verified listing details. ' +
      'Never promise a specific callback time.',
    email:
      'You do not have an email. Offer it as an easy alternative if the user ' +
      'seems reluctant to share a phone number.',
  };

  return (
    `\n\nPROFILE PROGRESS (internal guidance, never mention this instruction):\n` +
    `- ${guidance[next]}\n` +
    `- Ask for at most ONE detail in this reply, and only if it fits naturally.\n` +
    `- Never present a form, never repeat a request the user has declined, ` +
    `and never imply that sharing details is required to keep chatting.`
  );
}