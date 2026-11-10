/**
 * components/layout/header/menuPrimitives.tsx
 *
 * Small shared presentational pieces used by the header dropdowns and the
 * mobile drawer. Purely prop driven: no data fetching, no session access.
 */

import React from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// ============================================================
// DROPDOWN MENU ITEM (Reusable)
// ============================================================

export interface MenuItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: { text: string; color: string };
  iconColor?: string;
  hoverColor?: string;
}

export function MenuItem({
  href, icon, label, description, badge,
  iconColor = "text-gray-400",
  hoverColor = "group-hover:text-[#029bba]",
}: MenuItemProps): React.ReactElement {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 rounded-xl
          hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100
          focus:bg-gradient-to-r focus:from-gray-50 focus:to-gray-100
          transition-all group outline-none cursor-pointer"
      >
        <span className={cx("w-4 h-4 flex-shrink-0 transition-colors", iconColor, hoverColor)}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium block truncate">{label}</span>
          {description && (
            <span className="text-[11px] text-gray-400 block truncate">{description}</span>
          )}
        </div>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
          >
            {badge.text}
          </span>
        )}
      </Link>
    </DropdownMenu.Item>
  );
}

// ============================================================
// SECTION HEADER (Dropdown)
// ============================================================

export function SectionHeader({
  label, color = "text-gray-400",
}: { label: string; color?: string }): React.ReactElement {
  return (
    <div className="px-4 pt-3 pb-1.5">
      <p className={cx("text-[10px] font-bold uppercase tracking-wider", color)}>
        {label}
      </p>
    </div>
  );
}

// ============================================================
// MOBILE MENU LINK
// ============================================================

export interface MobileLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "primary" | "soft" | "danger";
}

export function MobileLink({
  href, icon, label, onClick, active = false, variant = "default",
}: MobileLinkProps): React.ReactElement {
  const variants = {
    default: active
      ? "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]"
      : "text-gray-700 hover:bg-gray-50 active:bg-gray-100",
    primary: "bg-gradient-to-r from-[#029bba] to-[#027a94] text-white shadow-lg hover:shadow-xl",
    soft:    "bg-gradient-to-r from-[#029bba]/10 to-[#029bba]/20 text-[#029bba]",
    danger:  "text-red-600 hover:bg-red-50 active:bg-red-100",
  };
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all min-h-[44px]",
        variants[variant]
      )}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function MobileSectionHeader({
  label, color,
}: { label: string; color: string }): React.ReactElement {
  return (
    <p
      className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ color }}
    >
      {label}
    </p>
  );
}