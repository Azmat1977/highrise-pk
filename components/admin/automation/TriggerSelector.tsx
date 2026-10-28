// components/admin/automation/TriggerSelector.tsx
// ═══════════════════════════════════════════════════════════════
// Visual trigger type selector for automation sequences
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Users, MessageSquare, TrendingUp, Play } from 'lucide-react';

export type AutomationTrigger =
  | 'subscriber_joined'
  | 'lead_created'
  | 'lead_status_changed'
  | 'manual';

interface TriggerOption {
  value:       AutomationTrigger;
  label:       string;
  urdu:        string;
  description: string;
  icon:        React.ReactNode;
  color:       string;
  bgColor:     string;
  borderColor: string;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    value:       'subscriber_joined',
    label:       'New Subscriber',
    urdu:        'نیا سبسکرائبر',
    description: 'Fires when someone subscribes to newsletter and verifies email',
    icon:        <Users className="w-5 h-5" />,
    color:       'text-teal-600',
    bgColor:     'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  {
    value:       'lead_created',
    label:       'New Lead Inquiry',
    urdu:        'نئی انکوائری',
    description: 'Fires when a new property or project inquiry is submitted',
    icon:        <MessageSquare className="w-5 h-5" />,
    color:       'text-blue-600',
    bgColor:     'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    value:       'lead_status_changed',
    label:       'Lead Status Changed',
    urdu:        'لیڈ اسٹیٹس تبدیل',
    description: 'Fires when a lead is marked as qualified, hot, etc.',
    icon:        <TrendingUp className="w-5 h-5" />,
    color:       'text-purple-600',
    bgColor:     'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    value:       'manual',
    label:       'Manual Enrollment',
    urdu:        'دستی انرولمنٹ',
    description: 'Admin manually adds recipients to this sequence',
    icon:        <Play className="w-5 h-5" />,
    color:       'text-amber-600',
    bgColor:     'bg-amber-50',
    borderColor: 'border-amber-200',
  },
];

interface TriggerSelectorProps {
  value:    AutomationTrigger | '';
  onChange: (trigger: AutomationTrigger) => void;
  disabled?: boolean;
}

export default function TriggerSelector({
  value,
  onChange,
  disabled = false,
}: TriggerSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
        Select what starts this automation
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TRIGGER_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`
                relative flex items-start gap-3 p-4 rounded-xl border-2 text-left
                transition-all duration-150
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                ${isSelected
                  ? `${option.borderColor} ${option.bgColor} ring-2 ring-offset-1 ring-current`
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {/* Icon */}
              <div className={`
                flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5
                ${isSelected ? `${option.bgColor} ${option.color}` : 'bg-gray-100 text-gray-500'}
              `}>
                {option.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`
                    font-bold text-sm
                    ${isSelected ? option.color : 'text-gray-800'}
                  `}>
                    {option.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {option.urdu}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {option.description}
                </p>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className={`
                  absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center
                  ${option.color} ${option.bgColor}
                `}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}