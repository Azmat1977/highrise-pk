// components/property/forms/shared/ProgressBar.tsx

import { TABS, TabId, TabStatus, AllTabStatuses } from './usePropertyForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  activeTab: TabId;
  tabStatuses: AllTabStatuses;
  completedTabCount: number;
  lastSaved: Date | null;
  isDirty: boolean;
  onSaveDraft: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSaved(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return 'Saved just now';
  if (diffMin < 60) return `Saved ${diffMin}m ago`;
  return `Saved at ${date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getStatusIcon(status: TabStatus): string {
  if (status === 'complete') return '✓';
  if (status === 'error') return '⚠';
  return '●';
}

function getStatusColor(status: TabStatus): string {
  if (status === 'complete') return 'text-[#10b981]';
  if (status === 'error') return 'text-[#ef4444]';
  return 'text-gray-300';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgressBar({
  activeTab,
  tabStatuses,
  completedTabCount,
  lastSaved,
  isDirty,
  onSaveDraft,
}: ProgressBarProps): React.ReactElement {
  const totalTabs = TABS.length;
  const progressPercent = Math.round((completedTabCount / totalTabs) * 100);
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  // Bar color: green when all done, yellow when errors exist
  const hasErrors = TABS.some(
    (t) => tabStatuses[t.id] === 'error'
  );
  const barColor = hasErrors ? 'bg-[#f59e0b]' : 'bg-[#10b981]';

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3">

        {/* ── Top Row: Step label + save status ── */}
        <div className="flex items-center justify-between mb-2">

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#004063]">
              Step {activeIndex + 1} of {totalTabs}
            </span>
            <span className="text-gray-300 text-sm">·</span>
            <span className="text-sm text-gray-500">
              {TABS[activeIndex].icon} {TABS[activeIndex].label}
            </span>
            <span className="text-gray-300 text-sm hidden sm:inline">·</span>
            <span className="text-sm font-medium text-[#029bba] hidden sm:inline">
              {progressPercent}% complete
            </span>
          </div>

          {/* Save status + button */}
          <div className="flex items-center gap-3">
            {lastSaved && !isDirty && (
              <span className="text-xs text-[#10b981] hidden sm:inline">
                {formatLastSaved(lastSaved)}
              </span>
            )}
            {isDirty && (
              <span className="text-xs text-[#f59e0b] hidden sm:inline">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={onSaveDraft}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#029bba] text-[#029bba] hover:bg-[#029bba] hover:text-white transition-colors duration-150 font-medium"
            >
              Save Draft
            </button>
          </div>
        </div>

        {/* ── Progress Bar Track ── */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPercent}% of form completed`}
          />
        </div>

        {/* ── Tab Status Dots (desktop) ── */}
        <div className="hidden sm:flex items-center justify-between">
          {TABS.map((tab, idx) => {
            const status = tabStatuses[tab.id];
            const isActive = tab.id === activeTab;

            return (
              <div
                key={tab.id}
                className="flex flex-col items-center gap-1"
              >
                {/* Dot + icon */}
                <div
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    transition-all duration-150
                    ${isActive
                      ? 'bg-[#029bba] text-white ring-2 ring-[#029bba] ring-offset-2'
                      : status === 'complete'
                      ? 'bg-[#10b981] text-white'
                      : status === 'error'
                      ? 'bg-[#ef4444] text-white'
                      : 'bg-gray-200 text-gray-400'
                    }
                  `}
                  title={`${tab.label}: ${status}`}
                >
                  {isActive ? (
                    <span>{idx + 1}</span>
                  ) : (
                    <span className={getStatusColor(status)}>
                      {getStatusIcon(status)}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-xs font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-[#029bba]'
                      : status === 'complete'
                      ? 'text-[#10b981]'
                      : status === 'error'
                      ? 'text-[#ef4444]'
                      : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Mobile: compact tab name row ── */}
        <div className="flex sm:hidden items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const status = tabStatuses[tab.id];
            const isActive = tab.id === activeTab;

            return (
              <div
                key={tab.id}
                className={`
                  flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-[#029bba] text-white'
                    : status === 'complete'
                    ? 'bg-[#10b981] bg-opacity-10 text-[#10b981]'
                    : status === 'error'
                    ? 'bg-red-50 text-[#ef4444]'
                    : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                {!isActive && status !== 'untouched' && (
                  <span className="font-bold">
                    {getStatusIcon(status)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}