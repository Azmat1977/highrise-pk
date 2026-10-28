// components/search/StickySearchHeader.tsx
//
// Replaces the full global header once the page banner has scrolled away.
// It is fixed, 64px tall, and shares the *same* field descriptors as the bar
// inside the banner, so typed text and selected values can never diverge.

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LayoutGrid, Search, X } from "lucide-react";
import { UnifiedSearchBar, type SearchField } from "@/components/search/UnifiedSearchBar";
import { PRIMARY_NAV_LINKS } from "@/components/layout/header";

export interface StickySearchHeaderProps {
  fields: SearchField[];
  onSubmit: () => void;
  submitLabel?: string;
  mobileLabel?: string;
  activeFilterCount?: number;
  onReset?: () => void;
}

export function StickySearchHeader({
  fields,
  onSubmit,
  submitLabel,
  mobileLabel,
  activeFilterCount,
  onReset,
}: StickySearchHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-[60] border-b border-slate-200/80 bg-white/95 shadow-[0_6px_24px_-16px_rgba(0,31,43,0.45)] backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Highrise.pk home"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/images/logo.png"
            alt="Highrise.pk"
            width={170}
            height={70}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#004063] lg:px-3"
          >
            <LayoutGrid className="h-4 w-4 text-[#029bba]" />
            <span className="hidden sm:inline">Browse</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+10px)] z-[61] w-[290px] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-18px_rgba(0,64,99,0.45)]"
            >
              <div className="grid grid-cols-2 gap-1">
                {PRIMARY_NAV_LINKS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#029bba]/8 hover:text-[#007196]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/properties"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#029bba]/8 hover:text-[#007196]"
                >
                  Tools &amp; Guides
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-slate-100 px-2.5 py-2 text-[12px] font-bold text-slate-500 transition-colors hover:text-[#004063]"
              >
                <X className="h-3.5 w-3.5" />
                Show full header
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <UnifiedSearchBar
            fields={fields}
            onSubmit={onSubmit}
            submitLabel={submitLabel ?? "Search"}
            mobileLabel={mobileLabel}
            variant="compact"
            activeFilterCount={activeFilterCount}
            onReset={onReset}
          />
        </div>

        <Link
          href="/properties"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-[#029bba] transition-colors hover:bg-[#029bba]/10 sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          All listings
        </Link>
      </div>
    </header>
  );
}

export default StickySearchHeader;
