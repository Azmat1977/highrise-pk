/**
 * components/project-detail/QuickActionsBar.tsx
 *
 * Highrise.pk — Sticky Quick Actions Bar (Project Detail Page)
 *
 * Appears after scrolling 380px. Portal rendered in document.body.
 * CSS-only animation (no framer-motion — per rules).
 *
 * CORRECTED APIS:
 *   useFavorites: isFavorite(entityId) + toggle(entityId, entityType)
 *   useCompare:   isInCompare(entityId) + toggle(entityId, entityType)
 *   ShareMenu:    project + isOpen + onClose (portal modal, no anchorRef)
 *
 * SECURITY:
 *   → No phone/email in DOM
 *   → Contact gating via UniversalInquiryModal
 *   → aria-pressed, aria-label, aria-expanded on all interactive elements
 *
 * SEO:
 *   → Portal rendered — outside main content flow
 *   → aria-label on nav landmark
 */

'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { icons } from '@/lib/design-system/icons';

import { useFavorites }      from '@/hooks/useFavorites';
import { useCompare }        from '@/hooks/useCompare';
import ShareMenu             from '@/components/projects/ShareMenu';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import AuthGateModal         from '@/components/auth/AuthGateModal';

import type { ProjectDetailData, InquiryType } from '@/types/projectDetail';

import {
  formatDetailPrice,
  getPrimaryImageUrl,
  getProjectAreaDisplay,
  getDeveloperDisplayName,
  toProjectListing,
} from '@/types/projectDetail';

const {
  Heart,
  LayoutGrid,
  Share2,
  Phone,
  Calendar,
  ChevronUp,
} = icons;

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface QuickActionsBarProps {
  project:          ProjectDetailData;
  overallMinPrice:  number | undefined;
  scrollThreshold?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useScrollVisibility — RAF throttled, SSR safe
// ─────────────────────────────────────────────────────────────────────────────

function useScrollVisibility(threshold: number) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mounted, threshold]);

  return { visible, mounted };
}

// toProjectListing imported from @/types/projectDetail (single source — dedup)

// ─────────────────────────────────────────────────────────────────────────────
// BAR INNER — actual rendered content
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionsBarInner({
  project,
  overallMinPrice,
  visible,
}: {
  project:         ProjectDetailData;
  overallMinPrice: number | undefined;
  visible:         boolean;
}) {
  const area          = getProjectAreaDisplay(project);
  const primaryImage  = getPrimaryImageUrl(project);
  const developerName = getDeveloperDisplayName(project.developerProfile);
  const listing       = toProjectListing(project, primaryImage, area);

  // ── SPRINT 2: Favorites — correct API ──
  const {
    isLoggedIn,
    isFavorite,
    actionState: favActionState,
    toggle:      toggleFavorite,
  } = useFavorites({ defaultEntityType: 'project' });

  const isFavorited = isFavorite(project._id);
  const favPending  = favActionState === 'pending';

  // ── SPRINT 3: Compare — correct API ──
  const {
    isInCompare,
    actionState: compareActionState,
    toggle:      toggleCompare,
  } = useCompare({ defaultEntityType: 'project' });

  const isCompared     = isInCompare(project._id);
  const comparePending = compareActionState === 'pending';

  // ── Share + Inquiry state ──
  const [shareOpen,   setShareOpen]   = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType>('project_interest');

  const handleInquiry = useCallback((type: InquiryType) => {
    setInquiryType(type);
    setInquiryOpen(true);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
            {/* ── Sticky bar ── */}
      <nav
        aria-label="Quick project actions"
        className={`
          fixed top-0 left-0 right-0 z-50
          bg-white border-b border-gray-200 shadow-md
          transition-transform duration-300 ease-in-out
          ${visible ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">

            {/* Left: mini project info */}
            <div className="hidden sm:block min-w-0 flex-1">
              <p className="text-sm font-black text-gray-900 truncate">
                {project.projectName}
              </p>
              <p className="text-xs font-bold text-[#029bba]">
                PKR {formatDetailPrice(overallMinPrice ?? null)}
              </p>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">

              {/* Scroll to top */}
              <button
                onClick={scrollToTop}
                aria-label="Scroll to top of page"
                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200
                           text-gray-600 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* FAVORITE — isFavorite(id) + toggle(id, type) */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthOpen(true);
                    return;
                  }
                  void toggleFavorite(project._id, 'project');
                }}
                disabled={favPending}
                aria-label={isFavorited ? 'Remove from shortlist' : 'Save to shortlist'}
                aria-pressed={isFavorited}
                className={`
                  flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                  text-xs font-bold transition-all duration-200
                  ${isFavorited
                    ? 'bg-[#029bba] text-white shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  ${favPending ? 'opacity-60 cursor-wait' : ''}
                `}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">
                  {isFavorited ? 'Saved' : 'Save'}
                </span>
              </button>

              {/* COMPARE — isInCompare(id) + toggle(id, type) */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthOpen(true);
                    return;
                  }
                  void toggleCompare(project._id, 'project');
                }}
                disabled={comparePending}
                aria-label={isCompared ? 'Remove from comparison' : 'Add to comparison'}
                aria-pressed={isCompared}
                className={`
                  flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                  text-xs font-bold transition-all duration-200
                  ${isCompared
                    ? 'bg-[#004063] text-white shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  ${comparePending ? 'opacity-60 cursor-wait' : ''}
                `}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isCompared ? 'Comparing' : 'Compare'}
                </span>
              </button>

              {/* SHARE — portal modal, no anchorRef */}
              <button
                onClick={() => setShareOpen(true)}
                aria-label="Share this project"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                           bg-gray-100 hover:bg-gray-200 text-gray-700
                           text-xs font-bold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* BOOK VISIT */}
              <button
                onClick={() => handleInquiry('site_visit')}
                aria-label="Book a site visit"
                className="hidden md:flex items-center gap-1.5 px-3 py-2.5
                           rounded-xl bg-white border border-gray-200
                           hover:bg-gray-50 text-gray-700
                           text-xs font-bold transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                Book Visit
              </button>

              {/* CONTACT — primary CTA */}
              <button
                onClick={() => handleInquiry('project_interest')}
                aria-label="Send inquiry about this project"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-[#029bba] to-[#017a94]
                           hover:from-[#02a8c9] hover:to-[#018a9a]
                           text-white text-xs font-bold transition-all
                           shadow-lg shadow-[#029bba]/20"
              >
                <Phone className="w-3.5 h-3.5" />
                Contact Now
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* ── SHARE MODAL — Sprint 1 portal modal ── */}
      <ShareMenu
        project={listing}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <AuthGateModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        context="save"
      />

      {/* ── INQUIRY MODAL — contact gating ── */}
      <UniversalInquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        entityType="project"
        entityId={project._id}
        entityCode={project.projectId}
        entityTitle={project.projectName}
        entityPrice={overallMinPrice}
        entityLocation={`${area}, ${project.city}`}
        entityImage={primaryImage}
        developerId={project.developer}
        developerName={developerName}
        leadType={inquiryType}
        buttonText={
          inquiryType === 'site_visit'
            ? 'Schedule Visit'
            : inquiryType === 'call_back'
            ? 'Request Callback'
            : 'Send Inquiry'
        }
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — Portal wrapper
// ─────────────────────────────────────────────────────────────────────────────

export default function QuickActionsBar({
  project,
  overallMinPrice,
  scrollThreshold = 380,
}: QuickActionsBarProps) {
  const { visible, mounted } = useScrollVisibility(scrollThreshold);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <QuickActionsBarInner
      project={project}
      overallMinPrice={overallMinPrice}
      visible={visible}
    />,
    document.body,
  );
}