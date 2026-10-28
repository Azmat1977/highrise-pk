// components/admin/automation/StepEditor.tsx
// ═══════════════════════════════════════════════════════════════
// Editor for a single automation step
// Shows delay, subject, content (TipTap), from name/email
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import {
  Clock, Mail, User, ChevronDown, ChevronUp, Trash2, GripVertical, Eye,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/admin/campaigns/RichTextEditor'),
  { ssr: false, loading: () => <div className="h-48 bg-gray-50 rounded-xl animate-pulse" /> }
);

export interface StepData {
  stepNumber:  number;
  delayDays:   number;
  subject:     string;
  previewText: string;
  content:     string;
  fromName:    string;
  fromEmail:   string;
}

interface StepEditorProps {
  step:          StepData;
  index:         number;
  totalSteps:    number;
  onChange:      (index: number, updated: Partial<StepData>) => void;
  onDelete:      (index: number) => void;
  onMoveUp:      (index: number) => void;
  onMoveDown:    (index: number) => void;
  defaultFromName?:  string;
  defaultFromEmail?: string;
}

// Delay presets
const DELAY_PRESETS = [
  { label: 'Immediately',  days: 0 },
  { label: 'After 1 day',  days: 1 },
  { label: 'After 2 days', days: 2 },
  { label: 'After 3 days', days: 3 },
  { label: 'After 5 days', days: 5 },
  { label: 'After 7 days', days: 7 },
  { label: 'After 10 days', days: 10 },
  { label: 'After 14 days', days: 14 },
  { label: 'After 30 days', days: 30 },
  { label: 'Custom',       days: -1 },
];

export default function StepEditor({
  step,
  index,
  totalSteps,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  defaultFromName  = 'Highrise.pk',
  defaultFromEmail = '',
}: StepEditorProps) {
  const [expanded,       setExpanded]       = useState(index === 0);
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [showSenderOpts, setShowSenderOpts] = useState(false);
  const editorRef = useRef<any>(null);

  const delayPreset = DELAY_PRESETS.find((p) => p.days === step.delayDays);
  const delayLabel  = delayPreset && delayPreset.days !== -1
    ? delayPreset.label
    : `After ${step.delayDays} day${step.delayDays !== 1 ? 's' : ''}`;

  function handleDelayPreset(days: number) {
    if (days === -1) {
      setShowDelayInput(true);
    } else {
      onChange(index, { delayDays: days });
      setShowDelayInput(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Drag handle (visual only) */}
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />

        {/* Step badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#029bba] text-white text-sm font-bold flex items-center justify-center">
          {index + 1}
        </div>

        {/* Step summary */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">
            {step.subject || `Step ${index + 1} — (no subject)`}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {index === 0 && step.delayDays === 0
              ? 'Sends immediately on enrollment'
              : delayLabel + ' after previous step'}
          </p>
        </div>

        {/* Reorder controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === totalSteps - 1}
            onClick={() => onMoveDown(index)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
            title="Delete step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Expand toggle */}
        <div className="text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-gray-100 pt-4">

          {/* Delay selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
              <Clock className="w-3.5 h-3.5" />
              Send Delay
              {index === 0 && (
                <span className="text-gray-400 font-normal">(delay after enrollment)</span>
              )}
              {index > 0 && (
                <span className="text-gray-400 font-normal">(delay after previous step)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {DELAY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleDelayPreset(preset.days)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors
                    ${preset.days === step.delayDays || (preset.days === -1 && !DELAY_PRESETS.find((p) => p.days === step.delayDays && p.days !== -1))
                      ? 'bg-[#029bba] text-white border-[#029bba]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#029bba] hover:text-[#029bba]'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {showDelayInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={step.delayDays}
                  onChange={(e) => onChange(index, { delayDays: Math.min(365, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={step.subject}
              onChange={(e) => onChange(index, { subject: e.target.value })}
              placeholder="e.g. Welcome to Highrise.pk — Aapka Swagat Hai!"
              maxLength={255}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                         focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">
                Merge tags like {'{{firstName}}'} are supported
              </p>
              <span className={`text-xs ${step.subject.length > 200 ? 'text-amber-500' : 'text-gray-400'}`}>
                {step.subject.length}/255
              </span>
            </div>
          </div>

          {/* Preview text */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview Text
              <span className="text-gray-400 font-normal">(optional — shown in inbox)</span>
            </label>
            <input
              type="text"
              value={step.previewText}
              onChange={(e) => onChange(index, { previewText: e.target.value })}
              placeholder="Brief preview shown below subject line in email clients..."
              maxLength={200}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                         focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
            />
          </div>

          {/* Email Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Email Content <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <RichTextEditor
                ref={editorRef}
                content={step.content}
                onChange={(html: string) => onChange(index, { content: html })}
                placeholder="Write your email content here... Use merge tags like {{firstName}}, {{city}}"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              An unsubscribe footer is automatically added to every email
            </p>
          </div>

          {/* Sender Override (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowSenderOpts((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500
                         hover:text-gray-700 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              Override Sender for this Step
              {showSenderOpts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSenderOpts && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={step.fromName}
                    onChange={(e) => onChange(index, { fromName: e.target.value })}
                    placeholder={defaultFromName || 'Highrise.pk'}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm
                               focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={step.fromEmail}
                    onChange={(e) => onChange(index, { fromEmail: e.target.value })}
                    placeholder={defaultFromEmail || 'team@highrise.pk'}
                    maxLength={254}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm
                               focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none bg-white"
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-400">
                  Leave blank to use the sequence default sender
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}