// components/search/UnifiedSearchBar.tsx
//
// The one search shell used by every directory page.
//
// It is deliberately "dumb": the page owns the state and passes a list of
// FilterField descriptors. The shell decides how a field looks, the page
// decides which fields exist and what their values/options are. No query
// parameter names, API calls or listing rules live in here.
//
// Layout contract:
//   desktop (>=768px)  -> one strict row, 64px tall (48px in compact mode),
//                         max-w-[900px] (max-w-4xl when compact)
//   mobile  (<768px)   -> a single "Search …" button that opens a full-screen
//                         filter sheet

"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, MapPin, RotateCcw, Search, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchOption {
  value: string;
  label: string;
  count?: number;
}

interface BaseField {
  /** Stable identity, also used as the DOM id suffix. */
  key: string;
  label: string;
  placeholder?: string;
  /** Relative width on desktop. Defaults to 1. */
  grow?: number;
  /** Hide this field on md screens, show on lg. */
  secondTier?: boolean;
}

export interface TextSearchField extends BaseField {
  kind: "text";
  value: string;
  onChange: (value: string) => void;
  /** Fired on Enter while the input is focused. */
  onSubmit?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectSearchField extends BaseField {
  kind: "select";
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  /** Adds a type-to-filter input inside the dropdown (long lists). */
  searchable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export type SearchField = TextSearchField | SelectSearchField;

export interface UnifiedSearchBarProps {
  fields: SearchField[];
  onSubmit: () => void;
  submitLabel?: string;
  /** Shown on the mobile trigger button, e.g. "Search Properties". */
  mobileLabel?: string;
  /** Compact mode is used inside the fixed sticky header. */
  variant?: "banner" | "compact";
  /** Optional reset affordance shown next to the submit button. */
  activeFilterCount?: number;
  onReset?: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function selectedLabel(field: SelectSearchField): string {
  if (!field.value) return field.placeholder ?? field.label;
  return field.options.find((option) => option.value === field.value)?.label ?? field.value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field: select (button + popover)
// ─────────────────────────────────────────────────────────────────────────────

function SelectFieldCell({
  field,
  compact,
  open,
  onToggle,
  onClose,
  align,
  variant,
}: {
  field: SelectSearchField;
  compact: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  align: "left" | "right";
  variant: "banner" | "compact";
}) {
  const [query, setQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return field.options;
    return field.options.filter((option) =>
      option.label.toLowerCase().includes(needle)
    );
  }, [field.options, query]);

  const Icon = field.icon ?? MapPin;
  const isActive = Boolean(field.value);

  return (
    <div className="relative flex min-w-0 flex-1 items-stretch">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${fieldId}-listbox`}
        onClick={onToggle}
        className={cx(
          "flex h-full w-full min-w-0 items-center gap-1.5 px-2.5 text-left transition-colors focus:outline-none",
          "hover:bg-slate-50/80 focus-visible:bg-slate-50"
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[9px] font-bold uppercase leading-3 tracking-[0.06em] text-slate-400"
          >
            {field.label}
          </span>
          <span
            className={cx(
              "mt-0.5 block truncate font-semibold",
              compact ? "text-[12px]" : "text-[12.5px]",
              isActive ? "text-[#001f2b]" : "text-slate-400"
            )}
          >
            {selectedLabel(field)}
          </span>
        </span>
        <ChevronDown
          className={cx(
            "h-3 w-3 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180 text-[#029bba]"
          )}
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={cx(
            "absolute top-[calc(100%+10px)] z-[95] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-18px_rgba(0,64,99,0.45)]",
            "w-[300px] max-w-[calc(100vw-1.5rem)]",
            align === "right" ? "right-0" : "left-0"
          )}
          role="presentation"
        >
          {field.searchable && (
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Filter ${field.label.toLowerCase()}…`}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-800 placeholder:text-slate-500 focus:border-[#029bba] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#029bba]/15"
              />
            </div>
          )}

          <ul
            id={`${fieldId}-listbox`}
            role="listbox"
            aria-label={field.label}
            className="max-h-[268px] overflow-y-auto overscroll-contain p-1.5"
          >
            {field.options.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-slate-500">No options</li>
            )}
            {filtered.map((option) => {
              const selected = option.value === field.value;
              return (
                <li key={option.value || "__all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      field.onChange(option.value);
                      onClose();
                    }}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors",
                      selected
                        ? "bg-[#029bba]/10 font-semibold text-[#007196]"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {typeof option.count === "number" && option.count > 0 && (
                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                        {option.count.toLocaleString()}
                      </span>
                    )}
                    {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {variant === "compact" && (
            <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
              {filtered.length.toLocaleString()} option{filtered.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field: text
// ─────────────────────────────────────────────────────────────────────────────

function TextFieldCell({
  field,
  compact,
}: {
  field: TextSearchField;
  compact: boolean;
}) {
  const Icon = field.icon ?? Search;
  return (
    <label className="flex min-w-0 flex-1 cursor-text items-center gap-1.5 px-2.5 transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#029bba]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[9px] font-bold uppercase leading-3 tracking-[0.06em] text-slate-400">
          {field.label}
        </span>
        <input
          type="text"
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              field.onSubmit?.();
            }
          }}
          placeholder={field.placeholder ?? ""}
          aria-label={field.label}
          className={cx(
            "mt-0.5 block w-full truncate border-0 bg-transparent p-0 font-semibold text-[#001f2b] placeholder:font-medium placeholder:text-slate-500 focus:outline-none focus:ring-0",
            compact ? "text-[12px]" : "text-[12.5px]"
          )}
        />
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sheet field (native controls, best behaviour on touch)
// ─────────────────────────────────────────────────────────────────────────────

function MobileField({
  field,
  onClose,
}: {
  field: SearchField;
  onClose: () => void;
}) {
  const id = useId();
  if (field.kind === "select") {
    return (
      <div>
        <label
          htmlFor={id}
          className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"
        >
          {field.label}
        </label>
        <select
          id={id}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={onClose}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#029bba] focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
        >
          {field.options.map((option) => (
            <option key={option.value || "__all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"
      >
        {field.label}
      </label>
      <input
        id={id}
        type="text"
        value={field.value}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={onClose}
        placeholder={field.placeholder ?? ""}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 placeholder:font-medium placeholder:text-slate-500 focus:border-[#029bba] focus:outline-none focus:ring-2 focus:ring-[#029bba]/20"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function UnifiedSearchBar({
  fields,
  onSubmit,
  submitLabel = "Search",
  mobileLabel,
  variant = "banner",
  activeFilterCount = 0,
  onReset,
  className = "",
}: UnifiedSearchBarProps) {
  const compact = variant === "compact";
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  const closePopover = useCallback(() => setOpenKey(null), []);

  // One document listener for every popover — no duplicates per field.
  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setOpenKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpenKey(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  // Lock page scroll + Escape-to-close for the mobile sheet.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetOpen]);

  const submit = useCallback(() => {
    setOpenKey(null);
    setSheetOpen(false);
    onSubmit();
  }, [onSubmit]);

  const rowHeight = compact ? "h-12" : "h-16";

  // Fewer fields should not stretch into a mostly-empty 900px bar: the shell
  // keeps the spec'd 900px ceiling but tightens up for 2-3 field pages.
  const desktopMaxWidth = compact
    ? "max-w-4xl"
    : fields.length <= 2
      ? "max-w-[620px]"
      : fields.length === 3
        ? "max-w-[760px]"
        : "max-w-[900px]";

  return (
    <div className={cx("w-full", className)}>
      {/* ── Desktop / tablet: strict one row ───────────────────────────── */}
      <form
        ref={rootRef}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={cx(
          "mx-auto hidden w-full items-stretch rounded-xl border border-slate-200 bg-white md:flex",
          "shadow-[0_10px_30px_-12px_rgba(0,31,43,0.35)]",
          rowHeight,
          desktopMaxWidth
        )}
      >
        {fields.map((field, index) => {
          const isLast = index === fields.length - 1;
          return (
            <div
              key={field.key}
              className={cx(
                "relative flex min-w-0 items-stretch border-r border-slate-200/80",
                field.secondTier ? "hidden lg:flex" : "flex",
                isLast && "border-r-0"
              )}
              style={{ flexGrow: field.grow ?? 1, flexBasis: 0 }}
            >
              {field.kind === "text" ? (
                <TextFieldCell field={field} compact={compact} />
              ) : (
                <SelectFieldCell
                  field={field}
                  compact={compact}
                  variant={variant}
                  open={openKey === field.key}
                  onToggle={() =>
                    setOpenKey((current) => (current === field.key ? null : field.key))
                  }
                  onClose={closePopover}
                  align={isLast ? "right" : "left"}
                />
              )}
            </div>
          );
        })}

        {!compact && activeFilterCount > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex shrink-0 items-center gap-1.5 border-r border-slate-200/80 px-3 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#004063]"
            aria-label={`Reset ${activeFilterCount} filters`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Reset</span>
            <span className="rounded-full bg-[#004063] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          </button>
        )}

        <button
          type="submit"
          className={cx(
            "flex shrink-0 items-center justify-center gap-2 rounded-r-xl bg-[#017a8a] font-bold text-white transition-colors hover:bg-[#004063] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 focus-visible:ring-offset-2",
            compact ? "w-12" : "w-[92px]"
          )}
          aria-label={submitLabel}
        >
          <Search className={compact ? "h-4 w-4" : "hidden h-4 w-4 lg:block"} />
          <span className={compact ? "sr-only" : "text-[13px]"}>{submitLabel}</span>
        </button>
      </form>

      {/* ── Mobile: a single button that opens the filter sheet ────────── */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mx-auto flex h-12 w-full max-w-[520px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-[#004063] shadow-[0_10px_30px_-14px_rgba(0,31,43,0.45)] md:hidden"
      >
        <Search className="h-4 w-4 text-[#029bba]" />
        {mobileLabel ?? "Search properties"}
        {activeFilterCount > 0 && (
          <span className="ml-1 rounded-full bg-[#029bba] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {sheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex flex-col bg-white md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={mobileLabel ?? "Search filters"}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Refine search
                </p>
                <p className="text-base font-bold text-[#001f2b]">
                  {mobileLabel ?? "Search"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close search filters"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#004063]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
              {fields.map((field) => (
                <MobileField key={field.key} field={field} onClose={() => undefined} />
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {activeFilterCount > 0 && onReset && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setSheetOpen(false);
                  }}
                  className="h-12 shrink-0 rounded-xl border border-slate-200 px-4 text-[13px] font-bold text-slate-600"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#017a8a] text-sm font-bold text-white transition-colors active:bg-[#004063]"
              >
                <Search className="h-4 w-4" />
                {submitLabel}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default UnifiedSearchBar;
