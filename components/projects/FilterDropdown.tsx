/**
 * components/projects/FilterDropdown.tsx
 *
 * Reusable custom dropdown built on Radix DropdownMenu primitive.
 * Replaces native <select> for full styling control.
 *
 * Features:
 *   ✅ Always opens downward from trigger (Radix sideOffset)
 *   ✅ Full left-alignment of labels, counts, checkmark
 *   ✅ Lucide icon on left of trigger, chevron on right
 *   ✅ Optional live count badges per option
 *   ✅ Optional search input for long lists (Cities: 23+)
 *   ✅ Optional grouped options (Property Types: Residential / Plots / Commercial)
 *   ✅ Selected: teal check icon + teal text + subtle teal bg
 *   ✅ Hover: teal tint
 *   ✅ Keyboard nav: arrow keys, Enter, Escape, type-ahead
 *   ✅ Click outside closes automatically
 *   ✅ Focus trap + focus restore
 *   ✅ Max height + scroll for long lists
 *   ✅ Matches trigger width (min-width)
 *   ✅ Mobile-friendly tap targets
 *   ✅ Zero inline styles (except runtime dynamic values via Radix)
 */

import { useState, useMemo, type ElementType } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check, Search } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  count?: number;       // optional live count
  disabled?: boolean;   // grey out
}

export interface FilterOptionGroup {
  group:   string;      // group heading
  options: FilterOption[];
}

interface FilterDropdownProps {
  /** Lucide icon component for the trigger left side */
  icon:         ElementType;
  /** Placeholder text when nothing selected */
  placeholder:  string;
  /** Currently selected value ('' = nothing selected) */
  value:        string;
  /** Called with new selected value */
  onChange:     (value: string) => void;
  /** Flat option list OR grouped option list (mutually exclusive) */
  options?:     FilterOption[];
  groups?:      FilterOptionGroup[];
  /** Show a search input at the top (for long lists like Cities) */
  searchable?:  boolean;
  /** Search input placeholder text */
  searchPlaceholder?: string;
  /** Disabled state for the whole trigger */
  disabled?:    boolean;
  /** Compact 36px trigger for dense listing toolbars */
  compact?:     boolean;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function FilterDropdown({
  icon: Icon,
  placeholder,
  value,
  onChange,
  options,
  groups,
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  compact = false,
}: FilterDropdownProps) {

  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');

  // Compute the label of the currently selected option (for the trigger)
  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;

    if (options) {
      return options.find(o => o.value === value)?.label ?? placeholder;
    }
    if (groups) {
      for (const g of groups) {
        const hit = g.options.find(o => o.value === value);
        if (hit) return hit.label;
      }
    }
    return placeholder;
  }, [value, placeholder, options, groups]);

  const hasSelection = value !== '';

  // Filter options by search query (case-insensitive)
  const q = search.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!options) return null;
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, q]);

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!q) return groups;
    return groups
      .map(g => ({
        ...g,
        options: g.options.filter(o => o.label.toLowerCase().includes(q)),
      }))
      .filter(g => g.options.length > 0);
  }, [groups, q]);

  const hasResults = (filteredOptions && filteredOptions.length > 0)
                  || (filteredGroups && filteredGroups.length > 0);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>

      {/* ── TRIGGER ─────────────────────────────────────────── */}
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={`group relative w-full ${compact ? 'h-9 pl-8 pr-7 text-xs font-bold' : 'h-12 pl-9 pr-8 text-sm font-medium'} bg-white
                      border rounded-xl text-left
                      transition-all outline-none
                      ${disabled
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : `cursor-pointer hover:border-[#029bba]/40
                           focus:ring-2 focus:ring-[#029bba]
                           ${open ? 'border-[#029bba] ring-2 ring-[#029bba]/20' : 'border-gray-200'}
                           ${hasSelection ? 'text-gray-900' : 'text-gray-700'}`
                      }`}
        >
          {/* Left icon */}
          <Icon className={`absolute ${compact ? 'left-2.5 h-3.5 w-3.5' : 'left-3 h-4 w-4'} top-1/2 -translate-y-1/2
                            pointer-events-none text-[#029bba]`} />

          {/* Selected label — truncate on overflow */}
          <span className="block truncate">
            {selectedLabel}
          </span>

          {/* Chevron — rotates when open */}
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2
                                    ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-gray-400
                                    transition-transform duration-200
                                    ${open ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenu.Trigger>

      {/* ── DROPDOWN CONTENT ────────────────────────────────── */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="bottom"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)]
                     max-h-80 overflow-y-auto
                     bg-white rounded-xl border border-gray-200
                     shadow-2xl p-1.5
                     origin-top
                     data-[state=open]:animate-in
                     data-[state=closed]:animate-out
                     data-[state=closed]:fade-out-0
                     data-[state=open]:fade-in-0
                     data-[state=closed]:zoom-out-95
                     data-[state=open]:zoom-in-95"
        >
          {/* Optional search input */}
          {searchable && (
            <div className="sticky top-0 bg-white pt-1 pb-2 px-1 mb-1
                            border-b border-gray-100 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2
                                   w-3.5 h-3.5 text-gray-400
                                   pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-8 pr-3 bg-gray-50
                             border border-gray-200 rounded-lg
                             text-xs text-gray-700 placeholder-gray-400
                             focus:ring-2 focus:ring-[#029bba]/30
                             focus:border-[#029bba] focus:outline-none
                             focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* No results state */}
          {!hasResults && (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              No matches found
            </div>
          )}

          {/* Flat options list */}
          {filteredOptions?.map(opt => (
            <FilterDropdownItem
              key={opt.value}
              option={opt}
              isSelected={opt.value === value}
              onSelect={() => {
                onChange(opt.value);
                setSearch('');
                setOpen(false);
              }}
            />
          ))}

          {/* Grouped options */}
          {filteredGroups?.map((group, gIdx) => (
            <div key={group.group}>
              {gIdx > 0 && (
                <div className="my-1 border-t border-gray-100" />
              )}
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-black
                              uppercase tracking-wider text-gray-400">
                {group.group}
              </div>
              {group.options.map(opt => (
                <FilterDropdownItem
                  key={opt.value}
                  option={opt}
                  isSelected={opt.value === value}
                  onSelect={() => {
                    onChange(opt.value);
                    setSearch('');
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          ))}

        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── INTERNAL — DROPDOWN ITEM ─────────────────────────────────────────────────

interface FilterDropdownItemProps {
  option:      FilterOption;
  isSelected:  boolean;
  onSelect:    () => void;
}

function FilterDropdownItem({
  option, isSelected, onSelect,
}: FilterDropdownItemProps) {
  return (
    <DropdownMenu.Item
      disabled={option.disabled}
      onSelect={e => {
        e.preventDefault();  // don't auto-close on Enter — we handle it
        if (!option.disabled) onSelect();
      }}
      className={`flex items-center justify-between gap-3 px-2.5 py-2
                  rounded-lg text-sm cursor-pointer outline-none
                  transition-colors text-left
                  ${option.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-[#029bba]/10 text-[#029bba] font-semibold'
                      : 'text-gray-700 font-medium hover:bg-gray-50 focus:bg-gray-50'
                  }`}
    >
      {/* Left: check + label */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {isSelected && <Check className="w-4 h-4 text-[#029bba]" />}
        </div>
        <span className="truncate text-left">{option.label}</span>
      </div>

      {/* Right: optional count badge */}
      {typeof option.count === 'number' && option.count > 0 && (
        <span className={`flex-shrink-0 text-[10px] font-bold
                          px-1.5 py-0.5 rounded-full
                          ${isSelected
                            ? 'bg-[#029bba]/20 text-[#029bba]'
                            : 'bg-gray-100 text-gray-500'}`}>
          {option.count.toLocaleString()}
        </span>
      )}
    </DropdownMenu.Item>
  );
}