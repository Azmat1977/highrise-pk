import { readIfExists, result, summary, walk } from './lib/common.mjs';

export function testWp8Integration(root) {
  const tests = [];
  const contract = readIfExists(root, 'lib/property/propertyCommunicationContract.ts');
  const recipient = readIfExists(root, 'lib/property/propertyLeadRecipient.ts');
  const access = readIfExists(root, 'lib/property/propertyLeadAccess.ts');
  const service = readIfExists(root, 'lib/property/propertyCommunicationService.ts');
  const lead = readIfExists(root, 'models/Lead.ts');
  const detail = readIfExists(root, 'pages/property/[slug].tsx');

  tests.push(result('COM-RECIPIENT-OVERRIDE', /RECIPIENT_CONTROLLED_KEYS/.test(contract) && /assignedToUserId/.test(contract), 'Client recipient override fields are rejected centrally', 'lib/property/propertyCommunicationContract.ts'));
  tests.push(result('COM-INTENTS', ['inquiry', 'callback', 'site_visit'].every((v) => contract.includes(v)), 'Inquiry/callback/site-visit share one narrow contract', 'lib/property/propertyCommunicationContract.ts'));
  tests.push(result('COM-PRECEDENCE', /developerId/.test(recipient) && /agentId/.test(recipient) && /resolveOwner/.test(recipient), 'Recipient resolver encodes Developer → Agent → Owner accountable relationship order', 'lib/property/propertyLeadRecipient.ts'));
  tests.push(result('COM-FAIL-CLOSED', /INACTIVE_RECIPIENT/.test(recipient), 'Inactive explicit recipient fails closed', 'lib/property/propertyLeadRecipient.ts'));
  tests.push(result('COM-ACCESS-BOTH', /assignedToUserId/.test(access) && /assignedToRole/.test(access), 'Dashboard authorization matches both recipient user and role', 'lib/property/propertyLeadAccess.ts'));
  tests.push(result('COM-SERVER-REQUESTER', /DbCurrentRequester/.test(service) && /SELF_INQUIRY/.test(service), 'Lead builder uses DB-current requester and blocks self inquiry', 'lib/property/propertyCommunicationService.ts'));
  tests.push(result('COM-LEAD-OWNER', /assignedToRole/.test(lead) && /['\"]owner['\"]/.test(lead), 'Lead model supports Owner recipient role', 'models/Lead.ts'));
  tests.push(result('COM-DETAIL-NO-RECIPIENT', !/(developerId|ownerId|agentId|assignedToUserId)\s*:/.test(detail), 'Property detail does not submit recipient IDs', 'pages/property/[slug].tsx'));

  const propertyApis = walk(root, 'pages/api/properties').filter((rel) => /\.(ts|js)$/.test(rel));
  const communicationRoutes = propertyApis.filter((rel) => /inquir|lead|communicat|contact|visit|callback/i.test(rel));
  tests.push(result('COM-PROPERTY-ENDPOINT', communicationRoutes.length > 0, 'A Property-scoped communication endpoint exists after WP8 integration', communicationRoutes));

  const genericLead = readIfExists(root, 'pages/api/leads/index.ts') || readIfExists(root, 'pages/api/leads.ts');
  const genericInquiry = readIfExists(root, 'pages/api/inquiries/index.ts') || readIfExists(root, 'pages/api/inquiries.ts');
  const genericSources = `${genericLead}\n${genericInquiry}`;
  const bypassRisk = /(developerId|ownerId|agentId|assignedToUserId).*property/i.test(genericSources) && !/propertyCommunication|reject|410|retired/i.test(genericSources);
  tests.push(result('COM-NO-GENERIC-BYPASS', !bypassRisk, 'Generic lead/inquiry routes do not retain an obvious alternate Property recipient-routing bypass', 'pages/api/leads + pages/api/inquiries'));

  return { name: 'wp8-communication-integration', results: tests, summary: summary(tests) };
}
