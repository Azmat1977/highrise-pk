// components/property/forms/shared/FormSection.tsx

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeColor = 'blue' | 'green' | 'orange' | 'red' | 'purple';
type CompletionStatus = 'complete' | 'incomplete' | 'optional';

interface FormSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: BadgeColor;
  required?: boolean;
  description?: string;
  completionStatus?: CompletionStatus;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<BadgeColor, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<CompletionStatus, string> = {
  complete:   'bg-[#10b981]',
  incomplete: 'bg-[#f59e0b]',
  optional:   'bg-gray-300',
};

const STATUS_LABELS: Record<CompletionStatus, string> = {
  complete:   'Complete',
  incomplete: 'Incomplete',
  optional:   'Optional',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FormSection({
  id,
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  badgeColor = 'blue',
  required = false,
  description,
  completionStatus,
}: FormSectionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* ── Section Header ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        className="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
      >
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Status dot */}
          {completionStatus && (
            <span
              className={`flex-shrink-0 w-2 h-2 rounded-full ${STATUS_COLORS[completionStatus]}`}
              title={STATUS_LABELS[completionStatus]}
              aria-label={STATUS_LABELS[completionStatus]}
            />
          )}

          {/* Icon */}
          <span className="flex-shrink-0 text-[#029bba]" aria-hidden="true">
            {icon}
          </span>

          {/* Title + required marker */}
          <span className="font-semibold text-gray-800 truncate">
            {title}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </span>

          {/* Badge */}
          {badge && (
            <span
              className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badgeColor]}`}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {description && !isOpen && (
            <span className="text-xs text-gray-400 hidden sm:inline truncate max-w-[160px]">
              {description}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* ── Section Content — CSS transition, no framer-motion ── */}
      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={id}
        className={`
          transition-all duration-200 ease-in-out overflow-hidden
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}