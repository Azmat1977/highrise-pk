//C:\dev\highrise-pk\lib\property\propertyLeadRecipient.ts
/**
 * Highrise.pk — canonical Property lead recipient resolver.
 *
 * IMPORTANT:
 * - The browser never chooses a recipient.
 * - Resolution starts from the persisted Property.
 * - Relationship lookups are DB-current adapters supplied by the server layer.
 * - Precedence mirrors the accountable listing-actor rule used by WP5:
 *   Developer -> Agent -> Owner.
 */

export type PropertyRecipientRole = 'owner' | 'agent' | 'developer';

export interface PropertyRecipientAccount {
  userId: string;
  role: PropertyRecipientRole;
  displayName?: string;
  active: boolean;
  source: 'developer_relationship' | 'agent_relationship' | 'owner_relationship';
}

export interface PropertyRecipientProperty {
  id: string;
  developerId?: string | null;
  agentId?: string | null;
  ownerId?: string | null;
  createdBy?: string | null;
  userId?: string | null;
}

export interface PropertyRecipientLookup {
  resolveDeveloper: (
    property: PropertyRecipientProperty,
  ) => Promise<PropertyRecipientAccount | null>;
  resolveAgent: (
    property: PropertyRecipientProperty,
  ) => Promise<PropertyRecipientAccount | null>;
  resolveOwner: (
    property: PropertyRecipientProperty,
  ) => Promise<PropertyRecipientAccount | null>;
}

export type PropertyRecipientResolution =
  | {
      ok: true;
      recipient: PropertyRecipientAccount;
    }
  | {
      ok: false;
      code: 'NO_ACCOUNTABLE_RECIPIENT' | 'INACTIVE_RECIPIENT';
      message: string;
    };

function validAccount(
  account: PropertyRecipientAccount | null,
  expectedRole: PropertyRecipientRole,
): account is PropertyRecipientAccount {
  return Boolean(
    account &&
      account.userId &&
      account.role === expectedRole,
  );
}

async function evaluateCandidate(
  candidate: Promise<PropertyRecipientAccount | null>,
  role: PropertyRecipientRole,
): Promise<PropertyRecipientResolution | null> {
  const account = await candidate;
  if (!validAccount(account, role)) return null;

  if (!account.active) {
    return {
      ok: false,
      code: 'INACTIVE_RECIPIENT',
      message: 'The accountable listing account is not currently available.',
    };
  }

  return { ok: true, recipient: account };
}

export async function resolvePropertyLeadRecipient(
  property: PropertyRecipientProperty,
  lookup: PropertyRecipientLookup,
): Promise<PropertyRecipientResolution> {
  // Relationship presence controls which lookup is authoritative. We do not
  // silently fall through an explicit developer/agent relationship to an owner
  // if that business relationship resolves to an inactive account.
  if (property.developerId) {
    const developer = await evaluateCandidate(lookup.resolveDeveloper(property), 'developer');
    return developer ?? {
      ok: false,
      code: 'NO_ACCOUNTABLE_RECIPIENT',
      message: 'The persisted Developer relationship cannot be resolved to an active account.',
    };
  }

  if (property.agentId) {
    const agent = await evaluateCandidate(lookup.resolveAgent(property), 'agent');
    return agent ?? {
      ok: false,
      code: 'NO_ACCOUNTABLE_RECIPIENT',
      message: 'The persisted Agent relationship cannot be resolved to an active account.',
    };
  }

  const owner = await evaluateCandidate(lookup.resolveOwner(property), 'owner');
  if (owner) return owner;

  return {
    ok: false,
    code: 'NO_ACCOUNTABLE_RECIPIENT',
    message: 'No accountable recipient is configured for this Property.',
  };
}
