/**
 * Highrise.pk — server-owned Property communication lead builder.
 *
 * The adapter may persist this through the existing Lead model. The builder
 * deliberately takes an already public-eligible Property and a DB-current
 * authenticated requester; neither can be supplied directly by the browser.
 */

import type { ParsedPropertyCommunicationInput } from './propertyCommunicationContract';
import type { PropertyRecipientAccount } from './propertyLeadRecipient';

export interface DbCurrentRequester {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
}

export interface PublicEligiblePropertyForLead {
  id: string;
  title: string;
  price?: number;
  city?: string;
  locality?: string;
  slug?: string;
  publicEligible: true;
}

export interface PropertyLeadCreateShape {
  name: string;
  email: string;
  phone: string;
  message: string;
  leadType: ParsedPropertyCommunicationInput['leadType'];
  entityType: 'property';
  property: string;
  propertySnapshot: {
    _id: string;
    title: string;
    price?: number;
    city?: string;
    locality?: string;
    slug?: string;
  };
  source: 'property_page';
  assignedToUserId: string;
  assignedToRole: PropertyRecipientAccount['role'];
  assignedTo: string;
  scheduledVisit?: Date;
  timeline: Array<{
    action: 'created';
    description: string;
    performedBy: 'system';
    performedByRole: 'system';
    timestamp: Date;
  }>;
}

export type BuildPropertyLeadResult =
  | { ok: true; lead: PropertyLeadCreateShape }
  | {
      ok: false;
      code: 'INACTIVE_REQUESTER' | 'SELF_INQUIRY' | 'MISSING_REQUESTER_CONTACT';
      message: string;
    };

export function buildCanonicalPropertyLead(
  property: PublicEligiblePropertyForLead,
  requester: DbCurrentRequester,
  recipient: PropertyRecipientAccount,
  input: ParsedPropertyCommunicationInput,
  now: Date = new Date(),
): BuildPropertyLeadResult {
  if (!requester.active) {
    return {
      ok: false,
      code: 'INACTIVE_REQUESTER',
      message: 'Your account is not currently available for inquiries.',
    };
  }

  if (!requester.email.trim() || !requester.name.trim()) {
    return {
      ok: false,
      code: 'MISSING_REQUESTER_CONTACT',
      message: 'Your account needs a name and email before sending an inquiry.',
    };
  }

  if (requester.userId === recipient.userId) {
    return {
      ok: false,
      code: 'SELF_INQUIRY',
      message: 'You cannot send an inquiry to your own listing account.',
    };
  }

  const actionLabel =
    input.intent === 'site_visit'
      ? 'site visit request'
      : input.intent === 'callback'
        ? 'callback request'
        : 'property inquiry';

  const lead: PropertyLeadCreateShape = {
    name: requester.name.trim(),
    email: requester.email.trim().toLowerCase(),
    phone: (requester.phone ?? '').trim(),
    message: input.message,
    leadType: input.leadType,
    entityType: 'property',
    property: property.id,
    propertySnapshot: {
      _id: property.id,
      title: property.title,
      ...(property.price === undefined ? {} : { price: property.price }),
      ...(property.city ? { city: property.city } : {}),
      ...(property.locality ? { locality: property.locality } : {}),
      ...(property.slug ? { slug: property.slug } : {}),
    },
    source: 'property_page',
    assignedToUserId: recipient.userId,
    assignedToRole: recipient.role,
    assignedTo: '',
    ...(input.preferredVisitAt ? { scheduledVisit: input.preferredVisitAt } : {}),
    timeline: [
      {
        action: 'created',
        description: `Authenticated ${actionLabel} created and routed to the accountable ${recipient.role}.`,
        performedBy: 'system',
        performedByRole: 'system',
        timestamp: now,
      },
    ],
  };

  return { ok: true, lead };
}
