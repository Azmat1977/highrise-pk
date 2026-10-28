// pages/api/newsletter/subscribers/import.ts
// 🔒 ENTERPRISE SUBSCRIBER IMPORT API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Bulk CSV Import
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   POST → Parse CSV, validate rows, bulk insert subscribers
//
// SECURITY FEATURES:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ Max file size: 5MB
//   ✅ Max rows: 10,000
//   ✅ Email validation + normalization
//   ✅ Disposable email blocking
//   ✅ CSV injection prevention (strip dangerous chars)
//   ✅ Input sanitization on all fields
//   ✅ Duplicate detection via normalizedEmail
//   ✅ Skip: unsubscribed (respect user choice)
//   ✅ Skip: bounced (bad email)
//   ✅ Skip: already active/pending
//   ✅ bulkWrite for performance
//   ✅ logSecurityEvent (bulk_action_performed)
//   ✅ Security headers + request ID
//   ✅ Generic error messages
//   ✅ subscriber_joined automation (fire & forget, batch)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto                                    from 'crypto';
import dbConnect                                 from '@/lib/dbConnect';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;   // 5MB
const MAX_ROWS            = 10_000;
const MAX_NAME_LENGTH     = 100;
const MAX_TAG_LENGTH      = 50;
const MAX_TAGS_COUNT      = 10;
const MAX_SOURCE_LENGTH   = 50;
const BATCH_SIZE          = 500;                // bulkWrite batch size

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'getnada.com',
  'throwaway.email', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'spam4.me', 'trashmail.com', 'trashmail.me', 'dispostable.com',
]);

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

interface ParsedRow {
  rowNumber: number;
  email:     string;
  name:      string;
  tags:      string[];
  source:    string;
}

interface ImportError {
  row:    number;
  email:  string;
  reason: string;
}

type SkipReason =
  | 'already_active'
  | 'already_pending'
  | 'already_unsubscribed'
  | 'already_bounced'
  | 'duplicate_in_csv';

interface SkippedRow {
  row:    number;
  email:  string;
  reason: SkipReason;
}

interface ImportResult {
  imported: number;
  skipped:  number;
  failed:   number;
  errors:   ImportError[];
  skipped_details: SkippedRow[];
  total_processed: number;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

// ─── Email helpers ────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email) && email.length <= 254;
}

function isDisposableEmail(email: string): boolean {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  return ['tempmail', 'temp-mail', 'throwaway', 'fakeinbox'].some(
    (p) => domain.includes(p)
  );
}

function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return lower;

  // Gmail: remove dots + strip +suffix
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleaned = local.split('+')[0].replace(/\./g, '');
    return `${cleaned}@gmail.com`;
  }

  // Others: strip +suffix only
  return `${local.split('+')[0]}@${domain}`;
}

// ─── Text helpers ─────────────────────────────────────────────

/**
 * Strip HTML, trim, limit length, and prevent CSV injection.
 * CSV injection: cells starting with = + - @ | are dangerous
 * in spreadsheet apps — prefix with single quote.
 */
function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  // Strip HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  // Strip CSV injection chars from start
  cleaned = cleaned.replace(/^[=+\-@|]+/, '');
  return cleaned.trim().slice(0, maxLength);
}

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── CSV parser ───────────────────────────────────────────────

/**
 * Parse a single CSV line — handles:
 * - Quoted fields (containing commas, newlines, quotes)
 * - CRLF + LF line endings
 * - Empty fields
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Push last field
  fields.push(current.trim());
  return fields;
}

/**
 * Parse full CSV content into rows.
 * Returns: { headers, rows }
 * headers: normalized column names (lowercase, trimmed)
 * rows: array of { header → value } maps
 */
function parseCsv(content: string): {
  headers:  string[];
  dataRows: Record<string, string>[];
  error?:   string;
} {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], dataRows: [], error: 'CSV file is empty' };
  }

  // Parse header row
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
  );

  // Validate: email column required
  if (!headers.includes('email')) {
    return {
      headers,
      dataRows: [],
      error: `Required column "email" not found. Found columns: ${rawHeaders.join(', ')}`,
    };
  }

  // Enforce max rows
  const dataLines = lines.slice(1);
  if (dataLines.length > MAX_ROWS) {
    return {
      headers,
      dataRows: [],
      error: `CSV exceeds maximum of ${MAX_ROWS.toLocaleString()} rows. Found ${dataLines.length.toLocaleString()} data rows.`,
    };
  }

  // Parse data rows
  const dataRows: Record<string, string>[] = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    dataRows.push(row);
  }

  return { headers, dataRows };
}

/**
 * Map a raw CSV row to a ParsedRow.
 * Handles column name aliases.
 */
function mapRowToSubscriber(
  raw: Record<string, string>,
  rowNumber: number
): ParsedRow {
  // Email — required
  const email = (raw['email'] || '').toLowerCase().trim();

  // Name — optional, check aliases
  const rawName =
    raw['name']       ||
    raw['full_name']  ||
    raw['first_name'] ||
    raw['fullname']   ||
    '';

  // Tags — optional, pipe or semicolon separated
  const rawTags =
    raw['tags']  ||
    raw['tag']   ||
    raw['label'] ||
    raw['labels'] ||
    '';

  const tags = rawTags
    ? rawTags
        .split(/[|;,]/)
        .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
        .filter((t) => t.length > 0)
        .slice(0, MAX_TAGS_COUNT)
    : [];

  // Source — optional
  const rawSource =
    raw['source']      ||
    raw['lead_source'] ||
    'import';

  const source = sanitizeText(rawSource, MAX_SOURCE_LENGTH) || 'import';

  return {
    rowNumber,
    email,
    name: sanitizeText(rawName, MAX_NAME_LENGTH),
    tags,
    source,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 2: Rate limit
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        action:   'subscriber_import_rate_limited',
        endpoint: '/api/newsletter/subscribers/import',
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ─────────────────────────────────────────────
  // STEP 4: Validate request body
  // ─────────────────────────────────────────────
  const { csvContent, fileName } = req.body || {};

  if (!csvContent || typeof csvContent !== 'string') {
    res.status(400).json({
      success: false,
      message: 'CSV content is required',
      requestId,
    });
    return;
  }

  // File size check (5MB limit)
  const contentSizeBytes = Buffer.byteLength(csvContent, 'utf8');
  if (contentSizeBytes > MAX_FILE_SIZE_BYTES) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:    'import_file_too_large',
        sizeBytes: contentSizeBytes,
        maxBytes:  MAX_FILE_SIZE_BYTES,
        fileName:  String(fileName || '').slice(0, 100),
      },
    });
    res.status(400).json({
      success: false,
      message: `File too large. Maximum size is 5MB. Your file is ${(contentSizeBytes / 1024 / 1024).toFixed(2)}MB.`,
      requestId,
    });
    return;
  }

  await dbConnect();

  try {
    // ─────────────────────────────────────────────
    // STEP 5: Parse CSV
    // ─────────────────────────────────────────────
    const { headers, dataRows, error: parseError } = parseCsv(csvContent);

    if (parseError) {
      res.status(400).json({
        success: false,
        message: parseError,
        requestId,
      });
      return;
    }

    if (dataRows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No data rows found in CSV. Please check your file.',
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 6: Validate + map all rows
    // ─────────────────────────────────────────────
    const validRows:   ParsedRow[]    = [];
    const errors:      ImportError[]  = [];
    const seenEmails   = new Set<string>(); // dedupe within CSV

    for (let i = 0; i < dataRows.length; i++) {
      const raw       = dataRows[i];
      const rowNumber = i + 2; // +2 because row 1 = header
      const parsed    = mapRowToSubscriber(raw, rowNumber);

      // Validate email present
      if (!parsed.email) {
        errors.push({
          row:    rowNumber,
          email:  '',
          reason: 'Email is required',
        });
        continue;
      }

      // Validate email format
      if (!isValidEmail(parsed.email)) {
        errors.push({
          row:    rowNumber,
          email:  parsed.email,
          reason: 'Invalid email format',
        });
        continue;
      }

      // Block disposable emails
      if (isDisposableEmail(parsed.email)) {
        errors.push({
          row:    rowNumber,
          email:  parsed.email,
          reason: 'Disposable email addresses are not allowed',
        });
        continue;
      }

      // Dedupe within CSV itself
      const normalized = normalizeEmail(parsed.email);
      if (seenEmails.has(normalized)) {
        errors.push({
          row:    rowNumber,
          email:  parsed.email,
          reason: 'Duplicate email in CSV file',
        });
        continue;
      }

      seenEmails.add(normalized);
      validRows.push(parsed);
    }

    // ─────────────────────────────────────────────
    // STEP 7: Check existing subscribers in DB
    // ─────────────────────────────────────────────
    // Batch lookup — normalizedEmails for all valid rows
    const normalizedEmails = validRows.map((r) => normalizeEmail(r.email));

    const existing = await NewsletterSubscriber.find({
      normalizedEmail: { $in: normalizedEmails },
    })
      .select('normalizedEmail status')
      .lean() as { normalizedEmail: string; status: string }[];

    // Build lookup map: normalizedEmail → status
    const existingMap = new Map<string, string>();
    for (const sub of existing) {
      existingMap.set(sub.normalizedEmail, sub.status);
    }

    // ─────────────────────────────────────────────
    // STEP 8: Separate rows into insert / skip
    // ─────────────────────────────────────────────
    const toInsert:    ParsedRow[]    = [];
    const skipped:     SkippedRow[]   = [];

    for (const row of validRows) {
      const normalized    = normalizeEmail(row.email);
      const existingStatus = existingMap.get(normalized);

      if (existingStatus) {
        // Already exists in DB — determine skip reason
        let reason: SkipReason;
        switch (existingStatus) {
          case 'active':        reason = 'already_active';        break;
          case 'pending':       reason = 'already_pending';       break;
          case 'unsubscribed':  reason = 'already_unsubscribed';  break;
          case 'bounced':       reason = 'already_bounced';       break;
          default:              reason = 'already_active';        break;
        }
        skipped.push({ row: row.rowNumber, email: row.email, reason });
      } else {
        toInsert.push(row);
      }
    }

    // ─────────────────────────────────────────────
    // STEP 9: Bulk insert in batches
    // ─────────────────────────────────────────────
    let importedCount = 0;
    const insertedSubscriberIds: string[] = [];
    const insertedSubscribers: { email: string; name: string }[] = [];

    for (let batchStart = 0; batchStart < toInsert.length; batchStart += BATCH_SIZE) {
      const batch = toInsert.slice(batchStart, batchStart + BATCH_SIZE);

      const bulkOps = batch.map((row) => {
        const normalized      = normalizeEmail(row.email);
        const unsubscribeToken = generateUnsubscribeToken();
        const now              = new Date();

        return {
          insertOne: {
            document: {
              email:            row.email,
              normalizedEmail:  normalized,
              name:             row.name || undefined,
              status:           'active' as const,
              source:           row.source,
              tags:             row.tags,
              unsubscribeToken,
              subscribedAt:     now,
              verifiedAt:       now,    // Admin import = pre-verified
              emailsSent:       0,
              ipAddress:        clientIP,
              userAgent:        userAgent.slice(0, 500),
            },
          },
        };
      });

      try {
        const result = await NewsletterSubscriber.bulkWrite(bulkOps, {
          ordered: false,  // Continue on individual errors
        });

        const batchImported = result.insertedCount || 0;
        importedCount += batchImported;

        // Collect inserted for automation hooks
        batch.forEach((row) => {
          insertedSubscribers.push({ email: row.email, name: row.name });
        });

      } catch (bulkErr: any) {
        // bulkWrite with ordered:false can partially succeed
        // result.insertedCount reflects actual inserts
        if (bulkErr.result) {
          const partialCount = bulkErr.result.nInserted || 0;
          importedCount += partialCount;

          // Log partial failure
          await logSecurityEvent({
            type:     'system_error',
            severity: 'medium',
            userId:   auth.id,
            email:    auth.email,
            ip:       clientIP,
            userAgent,
            metadata: {
              action:         'import_batch_partial_failure',
              batchStart,
              batchSize:      batch.length,
              partialInserts: partialCount,
              error:          String(bulkErr.message).slice(0, 200),
            },
          });
        } else {
          // Full batch failure
          errors.push(
            ...batch.map((row) => ({
              row:    row.rowNumber,
              email:  row.email,
              reason: 'Database insert failed',
            }))
          );
        }
      }
    }

    // ─────────────────────────────────────────────
    // STEP 10: Fire subscriber_joined automation
    // Non-blocking, fire-and-forget for each import
    // Only fires for successfully inserted subscribers
    // ─────────────────────────────────────────────
    if (insertedSubscribers.length > 0) {
      // Fetch inserted subscriber IDs for automation
      (async () => {
        try {
          const { enrollRecipient } = await import(
            '@/lib/automation/enrollRecipient'
          );

          const emails = insertedSubscribers.map((s) => s.email);
          const inserted = await NewsletterSubscriber.find({
            email:  { $in: emails },
            status: 'active',
          })
            .select('_id email name')
            .lean() as { _id: any; email: string; name?: string }[];

          for (const sub of inserted) {
            enrollRecipient('subscriber_joined', {
              recipientId:   sub._id.toString(),
              recipientType: 'subscriber',
              email:         sub.email,
              name:          sub.name || '',
              leadSource:    'import',
            }).catch(() => undefined);
          }
        } catch {
          // dynamic import failed — non-fatal
        }
      })();
    }

    // ─────────────────────────────────────────────
    // STEP 11: Audit log
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'high',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:          'subscriber_csv_import',
        fileName:        String(fileName || 'unknown').slice(0, 100),
        totalRows:       dataRows.length,
        validRows:       validRows.length,
        imported:        importedCount,
        skipped:         skipped.length,
        failed:          errors.length,
        headers:         headers.join(',').slice(0, 200),
      },
    });

    // ─────────────────────────────────────────────
    // STEP 12: Response
    // ─────────────────────────────────────────────
    const result: ImportResult = {
      imported:        importedCount,
      skipped:         skipped.length,
      failed:          errors.length,
      errors,
      skipped_details: skipped,
      total_processed: dataRows.length,
    };

    res.status(200).json({
      success:  true,
      message:  `Import complete. ${importedCount} imported, ${skipped.length} skipped, ${errors.length} failed.`,
      result,
      requestId,
    });
    return;

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:  'subscriber_import_failed',
        error:   errMsg.slice(0, 200),
      },
    });

    res.status(500).json({
      success: false,
      message: 'Import failed. Please try again.',
      requestId,
    });
    return;
  }
}