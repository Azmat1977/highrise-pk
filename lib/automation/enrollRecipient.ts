// lib/automation/enrollRecipient.ts
// ═══════════════════════════════════════════════════════════════
// AUTOMATION ENROLLMENT HELPER — HIGHRISE.PK
// SERVER ONLY — never import in client components
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Called from trigger points (verify.ts, leads/index.ts) to
//   enroll a recipient into all matching active automation
//   sequences for a given trigger type.
//
// DESIGN:
//   - Non-blocking: caller fires and forgets (no await needed)
//   - Never throws: all errors caught and logged to console
//   - Idempotent: skipIfAlreadyActive prevents duplicate enrollments
//   - Lightweight: only fetches active sequences for trigger type
//   - Daily cap: respects maxEnrollmentsPerDay per sequence
//
// USAGE:
//   // In verify.ts (subscriber_joined):
//   enrollRecipient('subscriber_joined', {
//     recipientId:   subscriber._id.toString(),
//     recipientType: 'subscriber',
//     email:         subscriber.email,
//     name:          subscriber.name || '',
//   }).catch(() => {});  // fire and forget
//
//   // In leads/index.ts (lead_created):
//   enrollRecipient('lead_created', {
//     recipientId:   lead._id.toString(),
//     recipientType: 'lead',
//     email:         lead.email,
//     name:          lead.name,
//     city:          lead.projectSnapshot?.city || lead.propertySnapshot?.city,
//     leadStatus:    lead.status,
//     leadSource:    lead.source,
//     leadType:      lead.leadType,
//   }).catch(() => {});  // fire and forget
// ═══════════════════════════════════════════════════════════════

import dbConnect              from '@/lib/dbConnect';
import AutomationSequence,
  { AutomationTrigger }       from '@/models/AutomationSequence';
import AutomationEnrollment   from '@/models/AutomationEnrollment';
import mongoose               from 'mongoose';

// ─── Recipient payload shape ──────────────────────────────────

export interface EnrollRecipientPayload {
  recipientId:    string;
  recipientType:  'subscriber' | 'lead';
  email:          string;
  name:           string;

  // Lead-specific (used for trigger filter matching)
  city?:          string;
  leadStatus?:    string;
  leadSource?:    string;
  leadType?:      string;

  // For lead_status_changed trigger
  previousStatus?: string;
  newStatus?:      string;
}

// ─── Main function ────────────────────────────────────────────

/**
 * Enroll a recipient into all matching active automation
 * sequences for the given trigger.
 *
 * Designed to be called fire-and-forget:
 *   enrollRecipient('lead_created', payload).catch(() => {});
 *
 * Never throws — all errors are silently caught.
 */
export async function enrollRecipient(
  trigger:  AutomationTrigger,
  payload:  EnrollRecipientPayload
): Promise<void> {
  try {
    await dbConnect();

    // ── Step 1: Find all active sequences for this trigger ────
    const sequences: any[] = await AutomationSequence.find({
      status:  'active',
      trigger,
    })
      .select(
        '_id name skipIfAlreadyActive maxEnrollmentsPerDay ' +
        'recipientType triggerFilters steps'
      )
      .lean();

    if (!sequences || sequences.length === 0) return;

    const now = new Date();

    for (const sequence of sequences) {
      try {
        // ── Step 2: Recipient type filter ─────────────────────
        // 'subscribers' sequences only enroll subscribers
        // 'leads' sequences only enroll leads
        // 'both' enroll either
        const seqRecipientType = sequence.recipientType || 'subscribers';

        if (
          seqRecipientType !== 'both' &&
          seqRecipientType !== payload.recipientType + 's'
        ) {
          continue;
        }

        // ── Step 3: Trigger filter matching ───────────────────
        const filters = sequence.triggerFilters || {};

        // City filter (leads only)
        if (
          filters.leadCities?.length > 0 &&
          payload.city &&
          !filters.leadCities.includes(payload.city)
        ) {
          continue;
        }

        // Status filter (leads only)
        if (
          filters.leadStatuses?.length > 0 &&
          payload.leadStatus &&
          !filters.leadStatuses.includes(payload.leadStatus)
        ) {
          continue;
        }

        // Source filter (leads only)
        if (
          filters.leadSources?.length > 0 &&
          payload.leadSource &&
          !filters.leadSources.includes(payload.leadSource)
        ) {
          continue;
        }

        // Lead type filter
        if (
          filters.leadTypes?.length > 0 &&
          payload.leadType &&
          !filters.leadTypes.includes(payload.leadType)
        ) {
          continue;
        }

        // Status change filter (lead_status_changed trigger)
        if (trigger === 'lead_status_changed') {
          if (
            filters.fromStatus &&
            payload.previousStatus !== filters.fromStatus
          ) {
            continue;
          }
          if (
            filters.toStatus &&
            payload.newStatus !== filters.toStatus
          ) {
            continue;
          }
        }

        // Subscriber source filter
        if (
          trigger === 'subscriber_joined' &&
          filters.subscriberSources?.length > 0 &&
          payload.leadSource &&
          !filters.subscriberSources.includes(payload.leadSource)
        ) {
          continue;
        }

        // ── Step 4: Skip if already active (if configured) ────
        if (sequence.skipIfAlreadyActive) {
          const existing = await AutomationEnrollment.findOne({
            sequenceId:    sequence._id,
            recipientId:   payload.recipientId,
            status:        'active',
          })
            .select('_id')
            .lean();

          if (existing) continue;
        }

        // ── Step 5: Daily enrollment cap check ────────────────
        if (sequence.maxEnrollmentsPerDay > 0) {
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);

          const todayCount = await AutomationEnrollment.countDocuments({
            sequenceId: sequence._id,
            enrolledAt: { $gte: startOfDay },
          });

          if (todayCount >= sequence.maxEnrollmentsPerDay) {
            console.warn(
              `[Automation] Daily cap reached for sequence "${sequence.name}" ` +
              `(${todayCount}/${sequence.maxEnrollmentsPerDay})`
            );
            continue;
          }
        }

        // ── Step 6: Skip sequences with no steps ──────────────
        if (!sequence.steps || sequence.steps.length === 0) continue;

        // ── Step 7: Calculate nextSendAt for step 1 ───────────
        const step1 = sequence.steps[0];
        const delayMs = (step1.delayDays || 0) * 24 * 60 * 60 * 1000;
        const nextSendAt = new Date(now.getTime() + delayMs);

        // ── Step 8: Create enrollment ─────────────────────────
        await AutomationEnrollment.create({
          sequenceId:    new mongoose.Types.ObjectId(sequence._id),
          recipientId:   payload.recipientId,
          recipientType: payload.recipientType,
          email:         payload.email.toLowerCase().trim(),
          name:          payload.name || '',
          currentStep:   1,
          status:        'active',
          nextSendAt,
          enrolledAt:    now,
          stepsCompleted: [],
          failedSteps:   [],
        });

        // ── Step 9: Increment sequence stats ──────────────────
        await AutomationSequence.updateOne(
          { _id: sequence._id },
          {
            $inc: {
              'stats.totalEnrolled': 1,
              'stats.activeCount':   1,
            },
          }
        );

      } catch (seqErr) {
        // Per-sequence error — log and continue to next sequence
        console.error(
          `[Automation] Failed to enroll in sequence "${sequence?.name}":`,
          seqErr instanceof Error ? seqErr.message : seqErr
        );
      }
    }
  } catch (err) {
    // Top-level error — log and return silently
    console.error(
      '[Automation] enrollRecipient failed:',
      err instanceof Error ? err.message : err
    );
  }
}