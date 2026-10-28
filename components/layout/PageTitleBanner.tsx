// components/layout/PageTitleBanner.tsx
//
// The single navy title banner used by every inner directory / tool page.
//
// Design contract (Phase 5):
//   - Full-bleed brand navy (#004063), desktop height ~152px, auto height on
//     mobile (py-6).
//   - Content is strictly centred: breadcrumb, H1, subtitle, search shell.
//   - Only the banner content is centred — the page body below keeps its own
//     left-aligned / grid layout.
//   - Decorative layer is a low-opacity gradient + hairline grid, no images.
//   - Titles are real page data only. Nothing here invents counts or badges.

import React from "react";

export interface PageTitleBannerProps {
  title: string;
  subtitle?: string;
  /** Small, centred breadcrumb trail rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Usually a <UnifiedSearchBar />; omitted on pages without search fields. */
  children?: React.ReactNode;
  /** Extra content under the search shell (e.g. active-filter chips). */
  footer?: React.ReactNode;
  className?: string;
}

export function PageTitleBanner({
  title,
  subtitle,
  breadcrumb,
  children,
  footer,
  className = "",
}: PageTitleBannerProps) {
  return (
    <section
      className={`relative isolate w-full overflow-hidden bg-[#004063] ${className}`}
      aria-labelledby="page-title-banner-heading"
    >
      {/* Soft brand glow — extremely low opacity so text contrast stays AAA. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 120% at 18% 130%, rgba(2,155,186,0.35) 0%, rgba(2,155,186,0) 62%), radial-gradient(55% 110% at 84% -20%, rgba(2,155,186,0.22) 0%, rgba(2,155,186,0) 60%)",
        }}
      />
      {/* Hairline grid, masked out at the vertical edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, #000 35%, #000 65%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, #000 35%, #000 65%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col items-center justify-center px-4 pb-16 pt-6 text-center sm:px-6 md:min-h-[152px] md:pb-14 md:pt-5 lg:px-8">
        {breadcrumb ? (
          <div className="mb-2 flex w-full justify-center md:mb-2.5">{breadcrumb}</div>
        ) : null}

        <h1
          id="page-title-banner-heading"
          className="max-w-[22ch] text-[21px] font-black leading-[1.18] tracking-tight text-white sm:max-w-none sm:text-[26px] md:text-[30px]"
        >
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1 line-clamp-2 max-w-[46rem] text-[12.5px] leading-5 text-blue-100/90 sm:text-[13.5px] md:mt-1.5">
            {subtitle}
          </p>
        ) : null}

        {children ? <div className="mt-4 w-full md:mt-4">{children}</div> : null}
        {footer ? <div className="mt-3 w-full">{footer}</div> : null}
      </div>
    </section>
  );
}

export default PageTitleBanner;
