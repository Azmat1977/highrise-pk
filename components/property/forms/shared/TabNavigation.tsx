// components/property/forms/shared/TabNavigation.tsx

import { TABS, TabId, AllTabStatuses } from './usePropertyForm';
import { ChevronLeft, ChevronRight, Save, Send, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabNavigationProps {
  activeTab: TabId;
  tabStatuses: AllTabStatuses;
  isSubmitting: boolean;
  isDirty: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TabNavigation({
  activeTab,
  tabStatuses,
  isSubmitting,
  isDirty,
  onPrev,
  onNext,
  onSaveDraft,
  onSubmit,
}: TabNavigationProps): React.ReactElement {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const isFirstTab = activeIndex === 0;
  const isLastTab = activeIndex === TABS.length - 1;

  // Next tab info
  const nextTab = !isLastTab ? TABS[activeIndex + 1] : null;
  const prevTab = !isFirstTab ? TABS[activeIndex - 1] : null;

  // Check if all tabs are complete (no errors, none untouched)
  const allComplete = TABS.every(
    (t) => tabStatuses[t.id] === 'complete'
  );

  // Count tabs with errors
  const errorCount = TABS.filter(
    (t) => tabStatuses[t.id] === 'error'
  ).length;

  return (
    <div className="sticky bottom-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="max-w-5xl mx-auto px-4 py-3">

        {/* ── Error summary banner (shows when errors exist on submit) ── */}
        {isLastTab && errorCount > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm flex items-center gap-2">
            <span className="font-bold flex-shrink-0">⚠</span>
            <span>
              {errorCount} tab{errorCount > 1 ? 's have' : ' has'} errors.
              Please fix them before submitting.
            </span>
          </div>
        )}

        {/* ── Navigation Row ── */}
        <div className="flex items-center justify-between gap-3">

          {/* ── LEFT: Previous button ── */}
          <div className="flex-1 flex justify-start">
            {!isFirstTab ? (
              <button
                type="button"
                onClick={onPrev}
                disabled={isSubmitting}
                className="
                  flex items-center gap-2 px-4 py-2.5 rounded-xl
                  border border-gray-300 text-gray-700
                  hover:bg-gray-50 hover:border-gray-400
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  font-medium text-sm
                "
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">
                  {prevTab?.icon} {prevTab?.label}
                </span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : (
              // Empty placeholder to keep layout stable
              <div />
            )}
          </div>

          {/* ── CENTER: Save Draft ── */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting || !isDirty}
              className="
                flex items-center gap-2 px-4 py-2.5 rounded-xl
                border border-[#029bba] text-[#029bba]
                hover:bg-[#029bba] hover:text-white
                transition-colors duration-150
                disabled:opacity-40 disabled:cursor-not-allowed
                font-medium text-sm
              "
            >
              <Save className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
          </div>

          {/* ── RIGHT: Next or Submit ── */}
          <div className="flex-1 flex justify-end">
            {isLastTab ? (
              /* Submit button — only on last tab */
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="
                  flex items-center gap-2 px-5 py-2.5 rounded-xl
                  bg-[#029bba] text-white font-semibold text-sm
                  hover:bg-[#004063]
                  transition-colors duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  shadow-md hover:shadow-lg
                "
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 flex-shrink-0" />
                    <span>Submit Property</span>
                  </>
                )}
              </button>
            ) : (
              /* Next Tab button */
              <button
                type="button"
                onClick={onNext}
                disabled={isSubmitting}
                className="
                  flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-[#029bba] text-white font-semibold text-sm
                  hover:bg-[#004063]
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <span className="hidden sm:inline">
                  {nextTab?.label} {nextTab?.icon}
                </span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </button>
            )}
          </div>

        </div>

        {/* ── Bottom micro-row: tab counter + all-complete badge ── */}
        <div className="flex items-center justify-center gap-2 mt-2.5">

          {/* Tab pip indicators */}
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const status = tabStatuses[tab.id];
              const isActive = tab.id === activeTab;

              return (
                <div
                  key={tab.id}
                  title={`${tab.label}: ${status}`}
                  className={`
                    rounded-full transition-all duration-200
                    ${isActive
                      ? 'w-5 h-2 bg-[#029bba]'
                      : status === 'complete'
                      ? 'w-2 h-2 bg-[#10b981]'
                      : status === 'error'
                      ? 'w-2 h-2 bg-[#ef4444]'
                      : 'w-2 h-2 bg-gray-200'
                    }
                  `}
                />
              );
            })}
          </div>

          {/* All complete badge */}
          {allComplete && (
            <span className="text-xs font-medium text-[#10b981] flex items-center gap-1">
              <span>✓</span>
              <span>All sections complete</span>
            </span>
          )}

          {/* Error count badge */}
          {errorCount > 0 && (
            <span className="text-xs font-medium text-[#ef4444] flex items-center gap-1">
              <span>⚠</span>
              <span>
                {errorCount} section{errorCount > 1 ? 's need' : ' needs'} attention
              </span>
            </span>
          )}

        </div>
      </div>
    </div>
  );
}