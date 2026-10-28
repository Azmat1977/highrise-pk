// components/search/PageSearchShell.tsx
//
// One component that owns the whole top-of-page pattern:
//
//   [ navy PageTitleBanner + UnifiedSearchBar ]
//   [ 1px sentinel                            ]   <- IntersectionObserver
//   [ results …                               ]
//   [ fixed StickySearchHeader when scrolled   ]
//
// The page passes its *own* state-bound field descriptors in, so the banner bar
// and the sticky bar read and write exactly the same React state. There is no
// second copy of the query anywhere.
//
// Scroll detection uses IntersectionObserver on the sentinel (no scroll
// listener), which keeps the transition cheap and avoids layout thrash. The
// sticky bar is `position: fixed` and never inserts height into the flow, so
// nothing jumps when it appears.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { PageTitleBanner } from "@/components/layout/PageTitleBanner";
import { UnifiedSearchBar, type SearchField } from "@/components/search/UnifiedSearchBar";
import { StickySearchHeader } from "@/components/search/StickySearchHeader";
import { setStickySearchActive } from "@/lib/pageSearch/stickyStore";

export interface PageSearchShellProps {
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  fields: SearchField[];
  onSubmit: () => void;
  submitLabel?: string;
  mobileLabel?: string;
  activeFilterCount?: number;
  onReset?: () => void;
  /** Optional chips row under the search bar inside the banner. */
  bannerFooter?: React.ReactNode;
}

export function PageSearchShell({
  title,
  subtitle,
  breadcrumb,
  fields,
  onSubmit,
  submitLabel,
  mobileLabel,
  activeFilterCount,
  onReset,
  bannerFooter,
}: PageSearchShellProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Sticky only while the sentinel is *above* the viewport. Using the
        // bounding rect (not just isIntersecting) stops the bar from flashing
        // on while the user is still looking at the banner.
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Publish to the global store so <Header /> can slide out of the way.
  useEffect(() => {
    setStickySearchActive(stuck);
  }, [stuck]);

  // Always hand the top of the viewport back when leaving the page.
  useEffect(() => {
    return () => setStickySearchActive(false);
  }, []);

  return (
    <>
      {/* The banner keeps the spec'd 140-160px band; the search shell straddles
          its lower edge so the two read as one unit without inflating the band. */}
      <PageTitleBanner
        title={title}
        subtitle={subtitle}
        breadcrumb={breadcrumb}
        footer={bannerFooter}
      />

      <div className="relative z-20 mx-auto -mt-8 w-full max-w-[1280px] px-4 sm:px-6 md:-mt-10 lg:px-8">
        <UnifiedSearchBar
          fields={fields}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          mobileLabel={mobileLabel}
          activeFilterCount={activeFilterCount}
          onReset={onReset}
        />
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      {stuck && (
        <StickySearchHeader
          fields={fields}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          mobileLabel={mobileLabel}
          activeFilterCount={activeFilterCount}
          onReset={onReset}
        />
      )}
    </>
  );
}

export default PageSearchShell;
