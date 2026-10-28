// ========== FILE: components/admin/campaigns/MissionControl.tsx ==========
// 🎛️ ENTERPRISE MISSION CONTROL — HIGHRISE.PK
// The main 3-panel dashboard for campaign creation & editing
// ═══════════════════════════════════════════════════════════════
// ARCHITECTURE:
//
//   ┌─────────────────────────────────────────────────────────┐
//   │  CommandBar (top)                                        │
//   ├──────────────┬──────────────────────┬───────────────────┤
//   │              │                      │                    │
//   │  LEFT PANEL  │    CENTER PANEL      │  RIGHT PANEL       │
//   │              │                      │                    │
//   │  Mission     │  Form Fields         │  Live Preview      │
//   │  Checklist   │  Rich Text Editor    │  (Gmail Style)     │
//   │              │  Subject Analyzer    │                    │
//   │  Recipient   │  Spam Intelligence   │  Device Toggle     │
//   │  Panel       │  Sender Config       │  Dark Mode         │
//   │              │  Template Gallery    │                    │
//   │              │                      │                    │
//   └──────────────┴──────────────────────┴───────────────────┘
//
// FEATURES:
//   ✅ 3-panel responsive layout
//   ✅ Auto-save every 10 seconds
//   ✅ Manual save (Ctrl+S)
//   ✅ Test email sending
//   ✅ Full send flow with confirmation modal
//   ✅ Template gallery integration
//   ✅ Emoji picker for subject
//   ✅ All 10 sub-components integrated
//   ✅ Mobile-responsive preview toggle
//   ✅ Debounced auto-save
//   ✅ Change tracking
//   ✅ Loading states everywhere
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FileText,
  Type,
  Sparkles,
  Smile,
  Eye,
  X,
  AlertCircle,
  Tag,
  Home,
  BookTemplate,
} from 'lucide-react';

// Import all sub-components
import CommandBar, { SaveStatus }             from './CommandBar';
import MissionChecklist                        from './MissionChecklist';
import RecipientPanel                          from './RecipientPanel';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import LivePreview                             from './LivePreview';
import TemplateGallery, { TEMPLATES }          from './TemplateGallery';
import EmojiPicker                             from './EmojiPicker';
import SubjectAnalyzer                         from './SubjectAnalyzer';
import SpamIntelligence                        from './SpamIntelligence';
import SenderConfig, { SenderConfigData }      from './SenderConfig';
import SendConfirmModal                        from './SendConfirmModal';
import SaveTemplateModal                       from './SaveTemplateModal';

// 🆕 Phase 2 components
import RecipientSourceSelector,
  { RecipientSource }                          from './RecipientSourceSelector';
import PropertyInsertWidget                    from './PropertyInsertWidget';
import ABTestPanel, {
  ABTestConfig,
  getDefaultABConfig,
}                                              from './ABTestPanel';
import LeadFilterPanel,
  { LeadFilters, getDefaultFilters }           from './LeadFilterPanel';
import MergeTagPicker                          from './MergeTagPicker';
import RecipientPreviewModal                   from './RecipientPreviewModal';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export interface CampaignFormData {
  title:            string;
  subject:          string;
  previewText:      string;
  content:          string;
  template:         string;
  segments:         string[];
  fromName:         string;
  fromEmail:        string;
  replyTo:          string;
  // 🆕 Phase 2
  recipientSource:  RecipientSource;
  leadFilters:      LeadFilters;
  mergeTagsEnabled: boolean;
  // 🆕 Option C — A/B Testing
  abTestConfig:     ABTestConfig;
}

interface MissionControlProps {
  mode:                'create' | 'edit';
  initialData?:        Partial<CampaignFormData>;
  campaignId?:         string;
}

interface Banner {
  type:    'success' | 'error' | 'info';
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_DATA: CampaignFormData = {
  title:            '',
  subject:          '',
  previewText:      '',
  content:          '',
  template:         'custom',
  segments:         ['all'],
  fromName:         '',
  fromEmail:        '',
  replyTo:          '',
  // 🆕 Phase 2
  recipientSource:  'subscribers',
  leadFilters:      getDefaultFilters(),
  mergeTagsEnabled: true,
  // 🆕 Option C — A/B Testing
  abTestConfig:     getDefaultABConfig(),
};

const AUTO_SAVE_DELAY_MS = 10_000; // 10 seconds
const MAX_SUBJECT_LENGTH = 200;
const MAX_PREVIEW_LENGTH = 300;

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const MissionControl: React.FC<MissionControlProps> = ({
  mode,
  initialData,
  campaignId: initialCampaignId,
}) => {
  const router = useRouter();

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════

  const [data, setData] = useState<CampaignFormData>({
    ...DEFAULT_DATA,
    ...initialData,
    // 🆕 Phase 2 — deep merge leadFilters
    leadFilters: {
      ...getDefaultFilters(),
      ...(initialData?.leadFilters || {}),
    },
  });

  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId);

  // Save states
  const [saveStatus,     setSaveStatus]     = useState<SaveStatus>('idle');
  const [lastSavedAt,    setLastSavedAt]    = useState<Date | null>(null);
  const [isSaving,       setIsSaving]       = useState(false);
  const [isSending,      setIsSending]      = useState(false);
  const [isTestSending,  setIsTestSending]  = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  // UI states
  const [templateGalleryOpen,  setTemplateGalleryOpen]  = useState(false);
  const [emojiPickerOpen,      setEmojiPickerOpen]      = useState(false);
  const [sendModalOpen,        setSendModalOpen]        = useState(false);
  const [mobilePreviewOpen,    setMobilePreviewOpen]    = useState(false);
  const [saveTemplateOpen,     setSaveTemplateOpen]     = useState(false);
  const [banner,               setBanner]               = useState<Banner | null>(null);

  // 🆕 Phase 2 UI states
  const [mergeTagPickerOpen,    setMergeTagPickerOpen]    = useState(false);
  const [recipientPreviewOpen,  setRecipientPreviewOpen]  = useState(false);

  // 🆕 Option D — Property Insert Widget
  const [propertyWidgetOpen,    setPropertyWidgetOpen]    = useState(false);

  // 🆕 Phase 2 refs
  const mergeTagButtonRef = useRef<HTMLButtonElement | null>(null);

  // ✅ Editor ref — used to insert merge tags at cursor position
  const editorRef = useRef<RichTextEditorHandle | null>(null);

  // Refs
  const emojiButtonRef  = useRef<HTMLButtonElement | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);
  const lastSavedData     = useRef<string>(JSON.stringify(data));

  // ═══════════════════════════════════════════════════════════
  // RECIPIENT COUNT
  // ✅ Count now comes from RecipientPanel via onCountChange callback
  // Removed duplicate fetch — RecipientPanel is the single source
  // ═══════════════════════════════════════════════════════════

  const handleRecipientCountChange = useCallback((count: number) => {
    setRecipientCount(count);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // BANNER AUTO-DISMISS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(timer);
  }, [banner]);

  // ═══════════════════════════════════════════════════════════
  // FIELD UPDATER
  // ═══════════════════════════════════════════════════════════

  const updateField = useCallback(<K extends keyof CampaignFormData>(
    field: K,
    value: CampaignFormData[K]
  ) => {
    setData((prev) => {
      const updated = { ...prev, [field]: value };
      hasUnsavedChanges.current = JSON.stringify(updated) !== lastSavedData.current;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // AUTO-SAVE LOGIC
  // ═══════════════════════════════════════════════════════════

  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges.current) return;
    if (saveStatus === 'saving') return;

    // Skip auto-save if title is empty (avoid creating empty drafts)
    if (!data.title.trim() && !campaignId) return;

    setSaveStatus('saving');

    try {
      const res = await fetch('/api/newsletter/campaigns/auto-save', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          title:            data.title || 'Untitled Campaign',
          subject:          data.subject,
          content:          data.content,
          template:         data.template,
          segments:         data.segments,
          previewText:      data.previewText,
          fromName:         data.fromName,
          fromEmail:        data.fromEmail,
          replyTo:          data.replyTo,
          // 🆕 Phase 2
          recipientSource:  data.recipientSource,
          leadFilters:      data.leadFilters,
          mergeTagsEnabled: data.mergeTagsEnabled,
          // 🆕 Option C — A/B Testing
          abTest: data.abTestConfig.enabled ? {
            enabled:           data.abTestConfig.enabled,
            variantBSubject:   data.abTestConfig.variantBSubject,
            variantBPreview:   data.abTestConfig.variantBPreview,
            splitPercent:      data.abTestConfig.splitPercent,
            winnerMetric:      data.abTestConfig.winnerMetric,
            testDurationHours: data.abTestConfig.testDurationHours,
          } : undefined,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSaveStatus('saved');
        setLastSavedAt(new Date(result.autoSavedAt));
        lastSavedData.current = JSON.stringify(data);
        hasUnsavedChanges.current = false;

        // If this was a new campaign, capture the ID
        if (!campaignId && result.campaignId) {
          setCampaignId(result.campaignId);
          // Update URL without navigating (only in create mode)
          if (mode === 'create') {
            window.history.replaceState(
              null,
              '',
              `/admin/campaigns/${result.campaignId}/edit`
            );
          }
        }
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [data, campaignId, mode, saveStatus]);

  // Schedule auto-save timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges.current) {
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave();
      }, AUTO_SAVE_DELAY_MS);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [data, performAutoSave]);

  // ═══════════════════════════════════════════════════════════
  // MANUAL SAVE
  // ═══════════════════════════════════════════════════════════

  const handleManualSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const endpoint = campaignId
        ? `/api/newsletter/campaigns/${campaignId}`
        : '/api/newsletter/campaigns';
      const method = campaignId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:            data.title.trim(),
          subject:          data.subject.trim(),
          content:          data.content,
          template:         data.template,
          status:           'draft',
          segments:         data.segments,
          previewText:      data.previewText,
          fromName:         data.fromName,
          fromEmail:        data.fromEmail,
          replyTo:          data.replyTo,
          // 🆕 Phase 2
          recipientSource:  data.recipientSource,
          leadFilters:      data.leadFilters,
          mergeTagsEnabled: data.mergeTagsEnabled,
          // 🆕 Option C — A/B Testing
          abTest: data.abTestConfig.enabled ? {
            enabled:           data.abTestConfig.enabled,
            variantBSubject:   data.abTestConfig.variantBSubject,
            variantBPreview:   data.abTestConfig.variantBPreview,
            splitPercent:      data.abTestConfig.splitPercent,
            winnerMetric:      data.abTestConfig.winnerMetric,
            testDurationHours: data.abTestConfig.testDurationHours,
          } : undefined,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setBanner({ type: 'success', message: 'Campaign saved successfully' });
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        lastSavedData.current = JSON.stringify(data);
        hasUnsavedChanges.current = false;

        if (!campaignId && result.campaign?._id) {
          setCampaignId(result.campaign._id);
          if (mode === 'create') {
            window.history.replaceState(
              null,
              '',
              `/admin/campaigns/${result.campaign._id}/edit`
            );
          }
        }
      } else {
        setBanner({
          type: 'error',
          message: result.message || 'Failed to save campaign',
        });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error — please try again' });
    } finally {
      setIsSaving(false);
    }
  }, [data, campaignId, mode, isSaving]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // ═══════════════════════════════════════════════════════════
  // TEST EMAIL
  // ═══════════════════════════════════════════════════════════

  const handleTestEmail = useCallback(async (
    emails: string[]
  ): Promise<{ success: boolean; message: string }> => {
    // Save first if needed
    if (!campaignId) {
      await handleManualSave();
      // Wait a moment for state to settle
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const targetId = campaignId;
    if (!targetId) {
      return { success: false, message: 'Please save the campaign first' };
    }

    setIsTestSending(true);
    try {
      const res = await fetch('/api/newsletter/send-test', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:       emails.join(','),
          subject:  `[TEST] ${data.subject}`,
          template: data.template,
          content:  data.content,
        }),
      });

      const result = await res.json();
      return {
        success: !!result.success,
        message: result.success
          ? `Test email sent to ${emails.length} recipient${emails.length > 1 ? 's' : ''}`
          : (result.message || 'Failed to send test email'),
      };
    } catch {
      return { success: false, message: 'Network error — please try again' };
    } finally {
      setIsTestSending(false);
    }
  }, [campaignId, data.subject, data.template, data.content, handleManualSave]);

  // Quick test (from command bar)
  const handleQuickTest = useCallback(async () => {
    setSendModalOpen(true);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SEND CAMPAIGN
  // ═══════════════════════════════════════════════════════════

  const handleSend = useCallback(async (scheduleDate?: string) => {
    if (!campaignId) {
      await handleManualSave();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const targetId = campaignId;
    if (!targetId) {
      setBanner({ type: 'error', message: 'Please save the campaign first' });
      return;
    }

    setIsSending(true);

    try {
      // If scheduling, update the campaign first
      if (scheduleDate) {
        const updateRes = await fetch(`/api/newsletter/campaigns/${targetId}`, {
          method:      'PUT',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status:       'scheduled',
            scheduledFor: scheduleDate,
          }),
        });
        const updateResult = await updateRes.json();
        if (!updateResult.success) {
          throw new Error(updateResult.message || 'Failed to schedule');
        }

        setBanner({
          type:    'success',
          message: `Campaign scheduled for ${new Date(scheduleDate).toLocaleString()}`,
        });
        setTimeout(() => router.push('/admin/campaigns'), 1500);
        return;
      }

      // Otherwise, send immediately
      const res = await fetch(`/api/newsletter/campaigns/${targetId}/send`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({}),
      });

      const result = await res.json();

      if (result.success) {
        setBanner({
          type:    'success',
          message: result.message || 'Campaign sent successfully!',
        });
        setSendModalOpen(false);
        setTimeout(() => router.push('/admin/campaigns'), 1500);
      } else {
        setBanner({
          type:    'error',
          message: result.message || 'Failed to send campaign',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setBanner({ type: 'error', message: msg });
    } finally {
      setIsSending(false);
    }
  }, [campaignId, handleManualSave, router]);

  // ═══════════════════════════════════════════════════════════
  // TEMPLATE SELECTION
  // ═══════════════════════════════════════════════════════════

  const handleTemplateSelect = useCallback((template: typeof TEMPLATES[0]) => {
    setData((prev) => ({
      ...prev,
      template:    template.id,
      content:     template.html,
      subject:     prev.subject || template.subject,
      previewText: prev.previewText || template.previewText,
    }));
    hasUnsavedChanges.current = true;
    setBanner({
      type:    'info',
      message: `Template "${template.name}" applied. Customize away!`,
    });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // EMOJI INSERTION
  // ═══════════════════════════════════════════════════════════

  const handleEmojiSelect = useCallback((emoji: string) => {
    setData((prev) => ({
      ...prev,
      subject: prev.subject + emoji,
    }));
    hasUnsavedChanges.current = true;
    setEmojiPickerOpen(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SENDER CONFIG UPDATE
  // ═══════════════════════════════════════════════════════════

  const handleSenderChange = useCallback((sender: SenderConfigData) => {
    setData((prev) => ({
      ...prev,
      fromName:  sender.fromName,
      fromEmail: sender.fromEmail,
      replyTo:   sender.replyTo,
    }));
    hasUnsavedChanges.current = true;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🆕 OPTION D — PROPERTY CARD INSERTION
  // ═══════════════════════════════════════════════════════════

  const handlePropertyInsert = useCallback((html: string) => {
    if (editorRef.current) {
      // Insert the full table-based card HTML at cursor position
      editorRef.current.insertAtCursor(html);
    } else {
      // Fallback: append to content string
      updateField('content', data.content + html);
    }
    updateField('content', data.content); // trigger re-render
  }, [data.content, updateField]);

  // ═══════════════════════════════════════════════════════════
  // 🆕 PHASE 2 — MERGE TAG INSERTION (FIXED: cursor position)
  // ═══════════════════════════════════════════════════════════

  const handleMergeTagInsert = useCallback((tag: string) => {
    if (editorRef.current) {
      // ✅ Insert at actual TipTap cursor position
      // editor.chain().focus().insertContent(tag) places tag
      // exactly where the user's cursor is in the editor
      editorRef.current.insertAtCursor(tag);
    } else {
      // Fallback: append to content string if editor not mounted
      updateField('content', data.content + tag);
    }
  }, [data.content, updateField]);

  // ═══════════════════════════════════════════════════════════
  // 🆕 PHASE 2 — SENDER CONFIG UPDATE (extends existing)
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // SCROLL TO SECTION
  // ═══════════════════════════════════════════════════════════

  const handleScrollTo = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add flash highlight
      element.classList.add('ring-4', 'ring-[#029bba]/30');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-[#029bba]/30');
      }, 1500);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED STATE
  // ═══════════════════════════════════════════════════════════

  const canSend =
    data.title.trim().length >= 3 &&
    data.subject.trim().length >= 5 &&
    data.content.trim().length >= 50 &&
    data.segments.length > 0 &&
    recipientCount > 0;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ═══════════════════════════════════════════
          COMMAND BAR (Top)
          ═══════════════════════════════════════════ */}
      <CommandBar
        title={data.title}
        onTitleChange={(t) => updateField('title', t)}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        canSend={canSend}
        isSending={isSending}
        isSaving={isSaving}
        isTestSending={isTestSending}
        onSave={handleManualSave}
        onSend={() => setSendModalOpen(true)}
        onTest={handleQuickTest}
        onPreviewToggle={() => setMobilePreviewOpen(true)}
      />

      {/* ═══════════════════════════════════════════
          BANNER (Top toast)
          ═══════════════════════════════════════════ */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 
                        max-w-md w-full mx-4">
          <div className={`
            p-4 rounded-2xl shadow-2xl flex items-start gap-3 
            ${
              banner.type === 'success'
                ? 'bg-emerald-500 text-white'
                : banner.type === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-[#029bba] text-white'
            }
          `}>
            <div className="flex-1">
              <p className="text-sm font-bold">{banner.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-white/80 hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MAIN LAYOUT (3-Panel)
          ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 
                      max-w-[1920px] mx-auto w-full">

        {/* ─────────────────────────────────────────
            LEFT PANEL — Checklist + Recipients
            ───────────────────────────────────────── */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">
          <MissionChecklist
            data={{
              title:          data.title,
              subject:        data.subject,
              content:        data.content,
              previewText:    data.previewText,
              segments:       data.segments,
              fromName:       data.fromName,
              fromEmail:      data.fromEmail,
              replyTo:        data.replyTo,
              recipientCount,
            }}
            onScrollTo={handleScrollTo}
          />

          {/* 🆕 Phase 2 — Recipient Source Selector */}
          <div id="campaign-recipients">
            <RecipientSourceSelector
              source={data.recipientSource}
              onSourceChange={(src) => updateField('recipientSource', src)}
              mergeTagsEnabled={data.mergeTagsEnabled}
              onMergeTagsChange={(enabled) => updateField('mergeTagsEnabled', enabled)}
            />
          </div>

          {/* 🆕 Phase 2 — Lead Filter Panel (only for leads/both) */}
          {(data.recipientSource === 'leads' || data.recipientSource === 'both') && (
            <LeadFilterPanel
              filters={data.leadFilters}
              onChange={(filters) => updateField('leadFilters', filters)}
              source={data.recipientSource}
              onPreviewClick={() => setRecipientPreviewOpen(true)}
            />
          )}

          {/* Legacy subscriber segments (subscribers only) */}
          {data.recipientSource === 'subscribers' && (
            <RecipientPanel
              selectedSegments={data.segments}
              onChange={(segments) => updateField('segments', segments)}
              onCountChange={handleRecipientCountChange}
            />
          )}
        </div>

        {/* ─────────────────────────────────────────
            CENTER PANEL — Form + Editor + Analytics
            ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Campaign Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 
                          p-5 space-y-4">
            <h2 className="text-sm font-black text-[#004063] uppercase 
                           tracking-wider flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[#029bba]" />
              Campaign Details
            </h2>

            {/* Subject Line */}
            <div id="campaign-subject">
              <label className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-700 uppercase 
                                 tracking-wider flex items-center gap-1.5">
                  <Type className="w-3 h-3" />
                  Email Subject
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-xs text-gray-400">
                  {data.subject.length}/{MAX_SUBJECT_LENGTH}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data.subject}
                  onChange={(e) => updateField('subject', e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
                  placeholder="e.g., 5 New Properties in DHA Phase 5 🏠"
                  className="w-full pl-3 pr-12 py-2.5 rounded-xl border 
                             border-gray-300 focus:ring-2 
                             focus:ring-[#029bba]/20 focus:border-[#029bba] 
                             outline-none text-sm"
                />
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 
                             rounded-lg text-gray-400 hover:text-[#029bba] 
                             hover:bg-gray-100 transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerOpen && (
                  <div className="absolute right-0 top-full">
                    <EmojiPicker
                      isOpen={emojiPickerOpen}
                      onClose={() => setEmojiPickerOpen(false)}
                      onSelect={handleEmojiSelect}
                      anchorRef={emojiButtonRef}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Preview Text */}
            <div id="campaign-preview-text">
              <label className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-700 uppercase 
                                 tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  Preview Text
                  <span className="text-gray-400 font-normal normal-case">
                    (inbox snippet)
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  {data.previewText.length}/{MAX_PREVIEW_LENGTH}
                </span>
              </label>
              <input
                type="text"
                value={data.previewText}
                onChange={(e) => updateField('previewText', e.target.value.slice(0, MAX_PREVIEW_LENGTH))}
                placeholder="Short preview shown next to subject in inbox..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 
                           focus:ring-2 focus:ring-[#029bba]/20 
                           focus:border-[#029bba] outline-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Gmail shows this next to your subject. Aim for 50-100 chars.
              </p>
            </div>
          </div>

          {/* Template + Content Editor */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
                          <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-[#004063] uppercase 
                             tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#029bba]" />
                Email Content
              </h2>
              <div className="flex items-center gap-2">
                {/* 🆕 Option D — Insert Property/Project Card Button */}
                <button
                  type="button"
                  onClick={() => setPropertyWidgetOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl 
                             bg-amber-100 text-amber-700 font-semibold 
                             text-xs hover:bg-amber-200 transition-colors"
                  title="Insert property or project card"
                >
                  <Home className="w-3.5 h-3.5" />
                  Insert Listing
                </button>

                {/* 🆕 Phase 2 — Merge Tag Picker Button */}
                {data.mergeTagsEnabled && (
                  <div className="relative">
                    <button
                      ref={mergeTagButtonRef}
                      type="button"
                      onClick={() => setMergeTagPickerOpen(!mergeTagPickerOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl 
                                 bg-purple-100 text-purple-700 font-semibold 
                                 text-xs hover:bg-purple-200 transition-colors"
                      title="Insert personalization tag"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {'{{Tags}}'}
                    </button>
                    {mergeTagPickerOpen && (
                      <MergeTagPicker
                        isOpen={mergeTagPickerOpen}
                        onClose={() => setMergeTagPickerOpen(false)}
                        onInsert={handleMergeTagInsert}
                        anchorRef={mergeTagButtonRef}
                      />
                    )}
                  </div>
                )}

                {/* 🆕 Option G — Save as Template Button */}
                <button
                  type="button"
                  onClick={() => setSaveTemplateOpen(true)}
                  disabled={!data.content.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl 
                             bg-emerald-100 text-emerald-700 font-semibold 
                             text-xs hover:bg-emerald-200 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  title={data.content.trim() ? 'Save current content as reusable template' : 'Add content before saving as template'}
                >
                  <BookTemplate className="w-3.5 h-3.5" />
                  Save Template
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateGalleryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl 
                             bg-[#029bba]/10 text-[#029bba] font-semibold 
                             text-xs hover:bg-[#029bba]/20 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Templates
                </button>
              </div>
            </div>

            <div id="campaign-content">
              <RichTextEditor
                ref={editorRef}
                content={data.content}
                onChange={(content) => updateField('content', content)}
                placeholder="Start writing your campaign content here..."
                minHeight="400px"
              />
            </div>
          </div>

          {/* Analytics Panels */}
          <div className="grid md:grid-cols-2 gap-4">
            <SubjectAnalyzer subject={data.subject} />
            <SpamIntelligence
              content={data.content}
              subject={data.subject}
              previewText={data.previewText}
            />
          </div>

          {/* 🆕 Option C — A/B Test Panel */}
          <ABTestPanel
            subjectA={data.subject}
            config={data.abTestConfig}
            onChange={(abTestConfig) => updateField('abTestConfig', abTestConfig)}
          />

          {/* Sender Config */}
          <div id="campaign-sender">
            <SenderConfig
              value={{
                fromName:  data.fromName,
                fromEmail: data.fromEmail,
                replyTo:   data.replyTo,
              }}
              onChange={handleSenderChange}
            />
          </div>
        </div>

        {/* ─────────────────────────────────────────
            RIGHT PANEL — Live Preview (Desktop only)
            ───────────────────────────────────────── */}
        <div className="hidden lg:block lg:w-[420px] flex-shrink-0">
          <div className="sticky top-24">
            <LivePreview
              content={data.content}
              subject={data.subject}
              previewText={data.previewText}
              fromName={data.fromName || 'Highrise.pk'}
              fromEmail={data.fromEmail || 'newsletter@highrise.pk'}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE PREVIEW OVERLAY
          ═══════════════════════════════════════════ */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 
                          border-b border-gray-200">
            <h3 className="text-sm font-black text-[#004063]">
              Email Preview
            </h3>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="p-2 rounded-xl hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <LivePreview
              content={data.content}
              subject={data.subject}
              previewText={data.previewText}
              fromName={data.fromName || 'Highrise.pk'}
              fromEmail={data.fromEmail || 'newsletter@highrise.pk'}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}
      <TemplateGallery
        isOpen={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        onSelect={handleTemplateSelect}
        currentTemplateId={data.template}
      />

      <SendConfirmModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSend={handleSend}
        onTest={handleTestEmail}
        campaignTitle={data.title}
        campaignSubject={data.subject}
        fromName={data.fromName || 'Highrise.pk'}
        fromEmail={data.fromEmail || 'newsletter@highrise.pk'}
        recipientCount={recipientCount}
        isSending={isSending}
      />

      {/* 🆕 Phase 2 — Recipient Preview Modal */}
      <RecipientPreviewModal
        isOpen={recipientPreviewOpen}
        onClose={() => setRecipientPreviewOpen(false)}
        source={data.recipientSource}
        leadFilters={data.leadFilters}
      />

      {/* 🆕 Option D — Property Insert Widget */}
      <PropertyInsertWidget
        isOpen={propertyWidgetOpen}
        onClose={() => setPropertyWidgetOpen(false)}
        onInsert={handlePropertyInsert}
      />

      {/* 🆕 Option G — Save as Template Modal */}
      {saveTemplateOpen && (
        <SaveTemplateModal
          isOpen={saveTemplateOpen}
          onClose={() => setSaveTemplateOpen(false)}
          onSaved={(templateId, templateName) => {
            setBanner({
              type:    'success',
              message: `Template "${templateName}" saved to your library!`,
            });
          }}
          subject={data.subject}
          previewText={data.previewText}
          content={data.content}
        />
      )}

      {/* ═══════════════════════════════════════════
          UNSAVED CHANGES WARNING
          ═══════════════════════════════════════════ */}
      {hasUnsavedChanges.current && saveStatus === 'error' && (
        <div className="fixed bottom-4 right-4 z-40 p-4 bg-white 
                        rounded-2xl shadow-xl border border-red-200 
                        flex items-start gap-3 max-w-sm">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 mb-1">
              Auto-save failed
            </p>
            <p className="text-xs text-gray-600 mb-2">
              Your changes are not saved. Click Save to try again.
            </p>
            <button
              type="button"
              onClick={handleManualSave}
              className="text-xs font-bold text-[#029bba] hover:underline"
            >
              Retry now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionControl;
// ========== END OF FILE ==========