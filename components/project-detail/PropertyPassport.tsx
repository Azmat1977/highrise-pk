/**
 * components/project-detail/PropertyPassport.tsx
 *
 * Highrise.pk — Property Passport (Digital Identity Card)
 *
 * WHAT IT SHOWS:
 *   → Unique Passport ID (HPP-YYYY-CCC-NNNNN)
 *   → Passport status (Verified / Partial / Pending)
 *   → Legal approval chain (NOC, SECP, Authority License)
 *   → Verification badges
 *   → Construction archive (timeline from updates)
 *   → Completeness meter
 *   → "This Property Has A Passport" branding moment
 *
 * SECURITY:
 *   → No sensitive data rendered
 *   → All computed from buildPropertyPassport() pure function
 *   → No external API calls
 *   → aria-labels on all elements
 *
 * SEO:
 *   → Section id="passport" for scroll spy
 *   → Semantic markup
 *   → Unique passport ID in page content
 */

'use client';

import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';

import type {
  PropertyPassport,
  LegalApproval,
  PassportBadge,
  ConstructionArchiveEntry,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface PropertyPassportProps {
  passport: PropertyPassport;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL APPROVAL ROW
// ─────────────────────────────────────────────────────────────────────────────

function LegalApprovalRow({ approval }: { approval: LegalApproval }) {
  const isApproved     = approval.status === 'approved';
  const isPending      = approval.status === 'pending';
  const isNotApplicable = approval.status === 'not_applicable';

  return (
    <div className="flex items-center justify-between py-2.5 border-b
                    border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                         flex-shrink-0 ${
          isApproved
            ? 'bg-emerald-50'
            : isPending
            ? 'bg-amber-50'
            : 'bg-gray-50'
        }`}>
          {isApproved && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          )}
          {isPending && (
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          )}
          {isNotApplicable && (
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800">
            {approval.label}
          </p>
          <p className="text-[10px] text-gray-400">{approval.authority}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isApproved
            ? 'bg-emerald-50 text-emerald-700'
            : isPending
            ? 'bg-amber-50 text-amber-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {isApproved
            ? 'Approved'
            : isPending
            ? 'Pending'
            : 'N/A'}
        </span>

        {approval.docUrl && (
          <a
            href={approval.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${approval.label} document`}
            className="p-1 text-gray-400 hover:text-[#029bba] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION BADGE
// ─────────────────────────────────────────────────────────────────────────────

function VerificationBadge({ badge }: { badge: PassportBadge }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     border text-xs font-bold ${
      badge.verified
        ? 'bg-white border-gray-200 shadow-sm'
        : 'bg-gray-50 border-gray-100 opacity-50'
    }`}>
      <span className="text-sm">{badge.emoji}</span>
      <span className={badge.color}>{badge.label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION ARCHIVE ENTRY
// ─────────────────────────────────────────────────────────────────────────────

function ArchiveEntry({ entry }: { entry: ConstructionArchiveEntry }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#029bba] ring-2
                        ring-[#029bba]/20" />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="flex-1 pb-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {entry.milestone}
          </p>
          <span className="text-[10px] font-bold text-[#029bba]
                           flex-shrink-0 bg-[#029bba]/5 px-2 py-0.5
                           rounded-full">
            {entry.progress}%
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-[10px] text-gray-400">
            {new Date(entry.date).toLocaleDateString('en-PK', {
              year: 'numeric',
              month: 'short',
            })}
          </p>
          {entry.hasPhotos && (
            <span className="text-[9px] text-gray-400 font-medium">
              📷 Photos
            </span>
          )}
          {entry.hasDrone && (
            <span className="text-[9px] text-gray-400 font-medium">
              🚁 Drone
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PropertyPassportComponent({
  passport,
}: PropertyPassportProps) {
  const [showArchive, setShowArchive] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const visibleBadges = showAllBadges
    ? passport.verificationBadges
    : passport.verificationBadges.slice(0, 4);

  const hasArchive = passport.constructionArchive.length > 0;

  return (
    <section
      id="passport"
      className="bg-white rounded-2xl border border-gray-200
                 shadow-sm overflow-hidden"
      aria-label="Property Passport"
    >
      {/* ── Header — Branding moment ── */}
      <div className="px-6 py-5 border-b border-gray-100
                      bg-gradient-to-r from-[#004063] to-[#029bba]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20
                            flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Property Passport
              </h2>
              <p className="text-white/70 text-xs font-medium">
                Pakistan&apos;s first verified property identity
              </p>
            </div>
          </div>

          {/* Status pill */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-black
                           flex-shrink-0 ${
            passport.status === 'verified'
              ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30'
              : passport.status === 'partial'
              ? 'bg-amber-400/20 text-amber-100 border border-amber-400/30'
              : 'bg-white/10 text-white/70 border border-white/20'
          }`}>
            {passport.statusLabel}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Passport ID Card ── */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl
                        border-2 border-dashed border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase font-black
                            tracking-[0.2em] mb-1">
                Passport ID
              </p>
              <p className="text-xl font-black font-mono text-[#004063]
                            tracking-wider">
                {passport.passportId}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">
                Issued:{' '}
                {new Date(passport.issuedDate).toLocaleDateString('en-PK', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="w-12 h-12 rounded-2xl bg-[#029bba]/10
                              flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#029bba]" />
              </div>
            </div>
          </div>

          {/* Project info */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid
                          grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-gray-400 uppercase font-bold">
                  Project
                </p>
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {passport.projectName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-gray-400 uppercase font-bold">
                  City
                </p>
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {passport.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-gray-400 uppercase font-bold">
                  Developer
                </p>
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {passport.developerName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-gray-400 uppercase font-bold">
                  Category
                </p>
                <p className="text-xs font-semibold text-gray-800 truncate capitalize">
                  {passport.category.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Completeness meter ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-700 uppercase
                          tracking-wider">
              Passport Completeness
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900">
                {passport.completeness}%
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {passport.completenessLabel}
              </span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                passport.completeness >= 70
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : passport.completeness >= 50
                  ? 'bg-gradient-to-r from-[#029bba] to-[#017a94]'
                  : 'bg-gradient-to-r from-amber-400 to-amber-600'
              }`}
              style={{ width: `${passport.completeness}%` }}
              role="progressbar"
              aria-valuenow={passport.completeness}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Passport ${passport.completeness}% complete`}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {passport.completeness < 70
              ? 'More documents and details will improve this passport score.'
              : 'This passport has strong documentation coverage.'}
          </p>
        </div>

        {/* ── Verification Badges ── */}
        {passport.verificationBadges.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-700 uppercase
                          tracking-wider mb-3">
              Verification Badges
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleBadges.map((badge, idx) => (
                <VerificationBadge key={idx} badge={badge} />
              ))}
            </div>

            {passport.verificationBadges.length > 4 && (
              <button
                onClick={() => setShowAllBadges(v => !v)}
                className="mt-2 text-[10px] text-[#029bba] font-bold
                           hover:underline flex items-center gap-1"
              >
                {showAllBadges
                  ? <><ChevronUp className="w-3 h-3" />Show less</>
                  : <><ChevronDown className="w-3 h-3" />
                    +{passport.verificationBadges.length - 4} more badges</>}
              </button>
            )}
          </div>
        )}

        {/* ── Legal Approval Chain ── */}
        {passport.legalApprovals.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-700 uppercase
                          tracking-wider mb-3">
              Legal Approval Chain
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-4">
              {passport.legalApprovals.map((approval, idx) => (
                <LegalApprovalRow key={idx} approval={approval} />
              ))}
            </div>
          </div>
        )}

        {/* ── Construction Archive ── */}
        {hasArchive && (
          <div>
            <button
              onClick={() => setShowArchive(v => !v)}
              aria-expanded={showArchive}
              aria-label="Toggle construction archive"
              className="w-full flex items-center justify-between
                         text-left group"
            >
              <p className="text-xs font-black text-gray-700 uppercase
                            tracking-wider group-hover:text-[#029bba]
                            transition-colors">
                Construction Archive
                <span className="ml-2 font-normal text-gray-400 normal-case
                                 tracking-normal text-[10px]">
                  ({passport.constructionArchive.length} updates on record)
                </span>
              </p>
              {showArchive
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showArchive && (
              <div className="mt-3 pl-2 max-h-64 overflow-y-auto
                              scrollbar-thin scrollbar-thumb-gray-200">
                {passport.constructionArchive.map((entry, idx) => (
                  <ArchiveEntry key={idx} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer note ── */}
        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
          <Shield className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Property Passport is issued by Highrise.pk upon verification of
            submitted documents. It is a transparency tool, not a legal
            guarantee. Always verify independently before purchasing.
          </p>
        </div>

      </div>
    </section>
  );
}