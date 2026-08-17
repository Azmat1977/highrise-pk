//C:\dev\highrise-pk\lib\property\propertyModeration.ts
import mongoose from "mongoose";
import type { IProperty } from "@/models/Property";
import {
  canTransitionPropertyVerification,
  isPropertyVerificationStatus,
  legacyStatusForVerification,
  type PropertyVerificationStatus,
} from "@/lib/property/propertyLifecycle";

export type PropertyModerationAction =
  | "start_review"
  | "verify"
  | "reject"
  | "flag"
  | "unflag"
  | "request_changes";

export type PropertyModerationInput = {
  action: PropertyModerationAction;
  adminId: string;
  reason?: string;
  internalNotes?: string;
};

export type PropertyModerationResult = {
  previousStatus: PropertyVerificationStatus;
  nextStatus: PropertyVerificationStatus;
};

function currentStatus(property: IProperty): PropertyVerificationStatus {
  const raw = property.verification?.status;
  return isPropertyVerificationStatus(raw) ? raw : "draft";
}

function targetForAction(action: PropertyModerationAction): PropertyVerificationStatus {
  switch (action) {
    case "start_review": return "under_review";
    case "verify": return "verified";
    case "reject":
    case "request_changes": return "rejected";
    case "flag": return "flagged";
    case "unflag": return "under_review";
  }
}

/**
 * Applies the canonical Property moderation lifecycle to an already loaded
 * document. The caller remains responsible for authorization, audit logging
 * and saving the document.
 */
export function applyPropertyModeration(
  property: IProperty,
  input: PropertyModerationInput,
): PropertyModerationResult {
  const previousStatus = currentStatus(property);
  const nextStatus = targetForAction(input.action);

  if (input.action === "unflag" && previousStatus !== "flagged") {
    throw new Error("Only a flagged Property can be unflagged.");
  }

  if (previousStatus !== nextStatus && !canTransitionPropertyVerification(previousStatus, nextStatus)) {
    throw new Error(`Invalid Property moderation transition: ${previousStatus} -> ${nextStatus}`);
  }

  const reason = String(input.reason || "").trim();
  const internalNotes = String(input.internalNotes || "").trim();
  if ((input.action === "reject" || input.action === "request_changes") && reason.length < 10) {
    throw new Error("Rejection/request-changes reason is required (minimum 10 characters).");
  }
  if (input.action === "flag" && reason.length < 5 && internalNotes.length < 5) {
    throw new Error("Flagging requires a reason or internal notes (minimum 5 characters).");
  }

  const now = new Date();
  const adminObjectId = new mongoose.Types.ObjectId(input.adminId);
  if (!property.verification) property.verification = { status: "draft" };

  property.verification.status = nextStatus;
  property.verification.lastReviewedAt = now;
  property.verification.requiresManualReview = nextStatus !== "verified";
  if (internalNotes) property.verification.internalNotes = internalNotes;

  if (nextStatus === "verified") {
    property.verification.verifiedAt = now;
    property.verification.verifiedBy = adminObjectId;
    property.verification.rejectedAt = undefined;
    property.verification.rejectedBy = undefined;
    property.verification.rejectionReason = undefined;
    property.isFlagged = false;
    property.flaggedAt = null;
    property.flagReason = null;
  } else if (nextStatus === "rejected") {
    property.verification.rejectedAt = now;
    property.verification.rejectedBy = adminObjectId;
    property.verification.rejectionReason = reason;
    property.verification.verifiedAt = undefined;
    property.verification.verifiedBy = undefined;
    property.isFlagged = false;
    property.flaggedAt = null;
    property.flagReason = null;
  } else if (nextStatus === "flagged") {
    property.isFlagged = true;
    property.flaggedAt = now;
    property.flagReason = reason || internalNotes;
    property.isFeatured = false;
  } else if (input.action === "unflag") {
    property.isFlagged = false;
    property.flaggedAt = null;
    property.flagReason = null;
    property.isFeatured = false;
  }

  const legacy = legacyStatusForVerification(nextStatus);
  property.status = legacy.status;
  property.isVerified = legacy.isVerified;
  property.isFlagged = legacy.isFlagged;
  property.updatedBy = adminObjectId;

  return { previousStatus, nextStatus };
}
