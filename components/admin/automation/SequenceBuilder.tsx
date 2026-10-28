// components/admin/automation/SequenceBuilder.tsx
// ═══════════════════════════════════════════════════════════════
// Main builder for automation sequences
// Combines TriggerSelector + StepEditor list + filters + settings
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  Plus, Save, Play, Pause, Settings, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Filter, Zap, Mail,
} from 'lucide-react';
import TriggerSelector, { AutomationTrigger } from './TriggerSelector';
import StepEditor, { StepData }               from './StepEditor';

// ─── Types ────────────────────────────────────────────────────

export interface SequenceFormData {
  name:             string;
  description:      string;
  trigger:          AutomationTrigger | '';
  status:           'draft' | 'active' | 'paused';
  steps:            StepData[];
  filters:          SequenceFiltersData;
  defaultFromName:  string;
  defaultFromEmail: string;
}

export interface SequenceFiltersData {
  subscriberSource: string[];
  leadCities:       string[];
  leadTypes:        string[];
  leadStatuses:     string[];
  leadPriorities:   string[];
  entityTypes:      string[];
}

const EMPTY_STEP = (stepNumber: number): StepData => ({
  stepNumber,
  delayDays:   stepNumber === 1 ? 0 : 3,
  subject:     '',
  previewText: '',
  content:     '',
  fromName:    '',
  fromEmail:   '',
});

const INITIAL_FORM: SequenceFormData = {
  name:             '',
  description:      '',
  trigger:          '',
  status:           'draft',
  steps:            [EMPTY_STEP(1)],
  filters:          {
    subscriberSource: [],
    leadCities:       [],
    leadTypes:        [],
    leadStatuses:     [],
    leadPriorities:   [],
    entityTypes:      [],
  },
  defaultFromName:  'Highrise.pk',
  defaultFromEmail: '',
};

// ─── Validation ───────────────────────────────────────────────

function validate(form: SequenceFormData): string[] {
  const errors: string[] = [];
  if (!form.name.trim())    errors.push('Sequence name is required');
  if (!form.trigger)        errors.push('Please select a trigger');
  if (form.steps.length === 0) errors.push('Add at least one step');
  form.steps.forEach((step, i) => {
    if (!step.subject.trim()) errors.push(`Step ${i + 1}: Subject is required`);
    if (!step.content.trim()) errors.push(`Step ${i + 1}: Content is required`);
  });
  return errors;
}

// ─── Filter chips helper ──────────────────────────────────────

function FilterChips({
  label, options, selected, onChange,
}: {
  label:    string;
  options:  { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(val: string) {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  }
  return (
    <div>
      <p className="text-xs font-bold text-gray-600 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`
              px-3 py-1 rounded-full text-xs font-semibold border transition-colors
              ${selected.includes(opt.value)
                ? 'bg-[#004063] text-white border-[#004063]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface SequenceBuilderProps {
  initialData?: Partial<SequenceFormData>;
  onSave:   (data: SequenceFormData) => Promise<void>;
  isSaving: boolean;
  mode:     'create' | 'edit';
}

export default function SequenceBuilder({
  initialData,
  onSave,
  isSaving,
  mode,
}: SequenceBuilderProps) {
  const [form, setForm] = useState<SequenceFormData>({
    ...INITIAL_FORM,
    ...initialData,
    steps: initialData?.steps?.length
      ? initialData.steps
      : [EMPTY_STEP(1)],
  });

  const [errors,         setErrors]         = useState<string[]>([]);
  const [showFilters,    setShowFilters]    = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);

  // ── Form field helpers ─────────────────────────────────────

  function updateField<K extends keyof SequenceFormData>(
    key: K,
    value: SequenceFormData[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors([]);
    setSaveSuccess(false);
  }

  function updateFilter<K extends keyof SequenceFiltersData>(
    key: K,
    value: SequenceFiltersData[K]
  ) {
    setForm((f) => ({ ...f, filters: { ...f.filters, [key]: value } }));
  }

  // ── Step CRUD ──────────────────────────────────────────────

  const handleStepChange = useCallback(
    (index: number, updated: Partial<StepData>) => {
      setForm((f) => {
        const steps = [...f.steps];
        steps[index] = { ...steps[index], ...updated };
        return { ...f, steps };
      });
    },
    []
  );

  function addStep() {
    if (form.steps.length >= 20) return;
    setForm((f) => ({
      ...f,
      steps: [
        ...f.steps,
        EMPTY_STEP(f.steps.length + 1),
      ],
    }));
  }

  function deleteStep(index: number) {
    setForm((f) => {
      const steps = f.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }));
      return { ...f, steps };
    });
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    setForm((f) => {
      const steps = [...f.steps];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= steps.length) return f;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return {
        ...f,
        steps: steps.map((s, i) => ({ ...s, stepNumber: i + 1 })),
      };
    });
  }

  // ── Save ───────────────────────────────────────────────────

  async function handleSave(targetStatus?: 'draft' | 'active' | 'paused') {
    const finalForm = targetStatus
      ? { ...form, status: targetStatus }
      : form;

    const errs = validate(finalForm);
    if (errs.length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors([]);
    try {
      await onSave(finalForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // onSave handles errors via banner in parent
    }
  }

  // ─── Render ───────────────────────────────────────────────

  const isLeadTrigger = form.trigger === 'lead_created' || form.trigger === 'lead_status_changed';
  const isSubTrigger  = form.trigger === 'subscriber_joined';

  return (
    <div className="space-y-6">

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 text-sm">Please fix these issues:</p>
              <ul className="mt-1 space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600">• {e}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700">
            {mode === 'create' ? 'Sequence created successfully!' : 'Changes saved successfully!'}
          </p>
        </div>
      )}

      {/* ── Section 1: Basic Info ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#004063]">
          <Zap className="w-5 h-5" />
          <h2 className="font-black text-base">Sequence Details</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Sequence Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. New Subscriber Welcome Series"
            maxLength={200}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                       focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Description
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="What is this automation for? (internal notes)"
            maxLength={1000}
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                       focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none resize-none"
          />
        </div>
      </div>

      {/* ── Section 2: Trigger ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[#004063] mb-4">
          <Play className="w-5 h-5" />
          <h2 className="font-black text-base">Trigger</h2>
          <span className="text-red-500 text-sm">*</span>
        </div>
        <TriggerSelector
          value={form.trigger}
          onChange={(t) => updateField('trigger', t)}
          disabled={mode === 'edit'}
        />
        {mode === 'edit' && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Trigger cannot be changed after creation (would affect existing enrollments)
          </p>
        )}
      </div>

      {/* ── Section 3: Filters ──────────────────────────── */}
      {form.trigger && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="w-full flex items-center justify-between px-5 py-4
                       hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 text-[#004063]">
              <Filter className="w-5 h-5" />
              <h2 className="font-black text-base">Audience Filters</h2>
              <span className="text-xs font-normal text-gray-400">
                (optional — restrict who qualifies)
              </span>
            </div>
            {showFilters
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>

          {showFilters && (
            <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">

              {isSubTrigger && (
                <FilterChips
                  label="Subscriber Source"
                  options={[
                    { value: 'website',  label: 'Website' },
                    { value: 'popup',    label: 'Popup' },
                    { value: 'footer',   label: 'Footer' },
                    { value: 'blog',     label: 'Blog' },
                    { value: 'referral', label: 'Referral' },
                  ]}
                  selected={form.filters.subscriberSource}
                  onChange={(v) => updateFilter('subscriberSource', v)}
                />
              )}

              {isLeadTrigger && (
                <>
                  <FilterChips
                    label="Lead City"
                    options={[
                      { value: 'Karachi',   label: 'Karachi' },
                      { value: 'Lahore',    label: 'Lahore' },
                      { value: 'Islamabad', label: 'Islamabad' },
                      { value: 'Rawalpindi', label: 'Rawalpindi' },
                      { value: 'Peshawar',  label: 'Peshawar' },
                      { value: 'Quetta',    label: 'Quetta' },
                    ]}
                    selected={form.filters.leadCities}
                    onChange={(v) => updateFilter('leadCities', v)}
                  />
                  <FilterChips
                    label="Inquiry Type"
                    options={[
                      { value: 'property_inquiry',  label: 'Property Inquiry' },
                      { value: 'project_interest',  label: 'Project Interest' },
                      { value: 'site_visit',        label: 'Site Visit' },
                      { value: 'rent_inquiry',      label: 'Rent Inquiry' },
                    ]}
                    selected={form.filters.leadTypes}
                    onChange={(v) => updateFilter('leadTypes', v)}
                  />
                  <FilterChips
                    label="Priority"
                    options={[
                      { value: 'urgent', label: '🔴 Urgent' },
                      { value: 'high',   label: '🟠 High' },
                      { value: 'medium', label: '🟡 Medium' },
                      { value: 'low',    label: '🟢 Low' },
                    ]}
                    selected={form.filters.leadPriorities}
                    onChange={(v) => updateFilter('leadPriorities', v)}
                  />
                  <FilterChips
                    label="Entity Type"
                    options={[
                      { value: 'project',  label: 'Project' },
                      { value: 'property', label: 'Property' },
                    ]}
                    selected={form.filters.entityTypes}
                    onChange={(v) => updateFilter('entityTypes', v)}
                  />
                </>
              )}

              <p className="text-xs text-gray-400">
                Leave all filters empty to enroll every qualifying recipient.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: Steps ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#004063]">
            <Mail className="w-5 h-5" />
            <h2 className="font-black text-base">Email Steps</h2>
            <span className="bg-[#004063] text-white text-xs rounded-full px-2 py-0.5 font-bold">
              {form.steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={addStep}
            disabled={form.steps.length >= 20}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#029bba] text-white
                       rounded-xl text-xs font-bold hover:bg-[#0289a7] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>

        {form.steps.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold text-sm">No steps yet</p>
            <p className="text-gray-400 text-xs mt-1">Add your first email step above</p>
          </div>
        )}

        {form.steps.map((step, index) => (
          <StepEditor
            key={index}
            step={step}
            index={index}
            totalSteps={form.steps.length}
            onChange={handleStepChange}
            onDelete={deleteStep}
            onMoveUp={(i) => moveStep(i, 'up')}
            onMoveDown={(i) => moveStep(i, 'down')}
            defaultFromName={form.defaultFromName}
            defaultFromEmail={form.defaultFromEmail}
          />
        ))}

        {form.steps.length > 0 && form.steps.length < 20 && (
          <button
            type="button"
            onClick={addStep}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl
                       text-gray-400 text-sm font-semibold hover:border-[#029bba]
                       hover:text-[#029bba] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Step
          </button>
        )}
      </div>

      {/* ── Section 5: Settings (collapsible) ────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-4
                     hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-[#004063]">
            <Settings className="w-5 h-5" />
            <h2 className="font-black text-base">Default Sender</h2>
            <span className="text-xs font-normal text-gray-400">
              (used for steps without override)
            </span>
          </div>
          {showSettings
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>

        {showSettings && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                From Name
              </label>
              <input
                type="text"
                value={form.defaultFromName}
                onChange={(e) => updateField('defaultFromName', e.target.value)}
                placeholder="Highrise.pk"
                maxLength={100}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Reply-To Email
              </label>
              <input
                type="email"
                value={form.defaultFromEmail}
                onChange={(e) => updateField('defaultFromEmail', e.target.value)}
                placeholder="team@highrise.pk"
                maxLength={254}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Action Bar ───────────────────────────────────── */}
      <div className="sticky bottom-4 z-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4
                        flex items-center justify-between gap-3">

          <div className="text-xs text-gray-500">
            {form.steps.length} step{form.steps.length !== 1 ? 's' : ''} ·{' '}
            {form.trigger || 'no trigger selected'}
          </div>

          <div className="flex items-center gap-2">
            {/* Save as draft */}
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200
                         rounded-xl text-sm font-semibold text-gray-700
                         hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            {/* Activate */}
            <button
              type="button"
              onClick={() => handleSave('active')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#029bba] text-white
                         rounded-xl text-sm font-bold hover:bg-[#0289a7] transition-colors
                         disabled:opacity-50"
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {mode === 'create' ? 'Create & Activate' : 'Save & Activate'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// (Mail icon is imported from lucide-react above)