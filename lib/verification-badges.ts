"use client";

import { BadgeCheck, Clock, X, Shield, AlertTriangle } from 'lucide-react';

export type VerificationStatus =
  | 'fully-verified'      // All documents verified (CNIC, ownership, NOC)
  | 'pending'             // Under review (CNIC submitted, docs uploaded)
  | 'rejected'            // Rejected, needs correction
  | 'not-applied';        // No verification applied (unregistered)

export interface VerificationLevel {
  status: VerificationStatus;
  documentsVerified?: string[]; // List of verified docs: ['CNIC', 'Ownership', 'NOC']
  rejectionReason?: string;
  expiresAt?: Date;
}

export function getVerificationBadgeProps(level: VerificationLevel): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  pulse?: boolean;
  tooltip: string;
} {
  switch (level.status) {
    case 'fully-verified':
      return {
        label: 'Verified Seller',
        icon: BadgeCheck,
        color: {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
        },
        pulse: false,
        tooltip: 'Fully verified with CNIC, documents, and property ownership confirmed',
      };
    case 'pending':
      return {
        label: 'Under Review',
        icon: Clock,
        color: {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
        },
        pulse: true,
        tooltip: 'Verification in progress. Documents submitted, awaiting approval (48-72 hrs)',
      };
    case 'rejected':
      return {
        label: 'Action Required',
        icon: AlertTriangle,
        color: {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
        },
        pulse: true,
        tooltip: level.rejectionReason || 'Verification rejected. Please contact support for details.',
      };
    case 'not-applied':
      return {
        label: 'Unverified',
        icon: Shield,
        color: {
          bg: 'bg-slate-50',
          text: 'text-slate-500',
          border: 'border-slate-200',
        },
        pulse: false,
        tooltip: 'This seller has not yet completed verification. May pose higher risk.',
      };
    default:
      return {
        label: 'Unverified',
        icon: Shield,
        color: {
          bg: 'bg-slate-50',
          text: 'text-slate-500',
          border: 'border-slate-200',
        },
        pulse: false,
        tooltip: 'Verification status unknown',
      };
  }
}

export function formatVerificationStatus(status: VerificationStatus): string {
  const statusMap: Record<VerificationStatus, string> = {
    'fully-verified': 'Full Verification',
    'pending': 'Verification Pending',
    'rejected': 'Verification Rejected',
    'not-applied': 'No Verification Applied',
  };
  return statusMap[status];
}

export function getVerificationProgress(level: VerificationLevel): number {
  switch (level.status) {
    case 'fully-verified':
      return 100;
    case 'pending':
      return 60;
    case 'rejected':
      return 30;
    case 'not-applied':
      return 0;
    default:
      return 0;
  }
}

export function getVerificationPriority(status: VerificationStatus): 'high' | 'medium' | 'low' {
  switch (status) {
    case 'fully-verified':
      return 'low';
    case 'pending':
      return 'medium';
    case 'rejected':
    case 'not-applied':
      return 'high';
    default:
      return 'medium';
  }
}

export function isVerificationExpiring(level: VerificationLevel): boolean {
  if (!level.expiresAt) return false;
  const daysUntilExpiry = Math.ceil(
    (level.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}