/**
 * components/layout/header/MegaMenuPanel.tsx
 *
 * Desktop mega-menu card for the global header. Purely presentational: the
 * open nav item, its measured geometry and the pointer/close callbacks arrive
 * via props from the header, which owns the trigger state machine.
 */

import React from "react";
import Link from "next/link";
import { icons } from "@/lib/design-system/icons";
import { cx } from "./menuPrimitives";
import type { NavItem } from "./navConfig";

export interface MegaMenuPanelProps {
  item: NavItem;
  panelBox: { left: number; width: number };
  onPointerEnter: () => void;
  onRequestClose: () => void;
}

export function MegaMenuPanel({
  item,
  panelBox,
  onPointerEnter,
  onRequestClose,
}: MegaMenuPanelProps): React.ReactElement {
  // Equal columns: every section is a short, single-column list, so no column
  // needs extra width (city names sit in one column).
  const gridTemplate = `repeat(${item.sections.length}, minmax(0, 1fr))`;

  return (
    <div
      className="absolute top-full z-50"
      style={{ left: panelBox.left, width: panelBox.width }}
      onMouseEnter={onPointerEnter}
    >
      {/* pt-2 is part of the card's own hover surface: it covers the gap
          between the header and the card so a slow pointer crossing it never
          leaves the interaction region. */}
      <div className="pt-2">
        <div
          id={`nav-panel-${item.key}`}
          role="menu"
          aria-label={item.label}
          className="nav-panel-enter overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_30px_70px_-24px_rgba(0,64,99,0.45)] ring-1 ring-black/[0.02]"
          onClick={(event) => {
            // Any link inside the panel closes the menu once clicked.
            // Navigation itself is handled by the Link in the same event.
            if ((event.target as HTMLElement).closest("a")) {
              onRequestClose();
            }
          }}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-[#004063] via-[#029bba] to-[#004063]" />

          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004063] text-white">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Browse
                </p>
                <p className="truncate text-[13.5px] font-bold leading-tight text-[#001f2b]">
                  {item.label}
                </p>
              </div>
            </div>
            <Link
              href={item.href}
              className="group flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#007196] transition-colors hover:border-[#029bba] hover:bg-[#029bba]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
            >
              View all
              <icons.ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </div>

          <div
            className={cx(
              "grid gap-x-5 gap-y-6 p-6",
              // Tall menus (Buy at short desktop heights) scroll inside the
              // card instead of running off screen.
              "max-h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain"
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {item.sections.map((section, sectionIndex) => (
              <div
                key={`${item.key}-${section.title}`}
                className={cx(
                  "min-w-0 px-3",
                  // Hairline column rules read cleaner than boxes and keep
                  // the panel from looking like a grid of cards.
                  sectionIndex > 0 && "border-l border-slate-100"
                )}
              >
                <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <span className="h-px w-3 bg-[#029bba]/60" aria-hidden="true" />
                  {section.title}
                </p>

                {section.kind === "cities" ? (
                  <>
                    <ul className="space-y-0.5">
                      {section.cities.map((cityName) => (
                        <li key={`${item.key}-city-${cityName}`}>
                          <Link
                            href={`${section.base}${section.base.includes("?") ? "&" : "?"}city=${encodeURIComponent(cityName)}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-semibold text-slate-700 transition-colors hover:bg-[#029bba]/[0.07] hover:text-[#004063] focus-visible:bg-[#029bba]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                          >
                            <icons.MapPin className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
                            <span className="truncate">{cityName}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={section.viewAllHref}
                      className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 px-2 py-2 text-[12px] font-bold text-[#007196] transition-colors hover:border-[#029bba] hover:bg-[#029bba]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                    >
                      Explore all cities
                      <icons.ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                ) : (
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={`${item.key}-${section.title}-${link.href}`}>
                        <Link
                          href={link.href}
                          className="flex items-center rounded-lg px-2 py-[7px] text-[13px] font-medium text-slate-600 transition-colors hover:bg-[#029bba]/[0.07] hover:text-[#004063] focus-visible:bg-[#029bba]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/40"
                        >
                          <span className="truncate">{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}