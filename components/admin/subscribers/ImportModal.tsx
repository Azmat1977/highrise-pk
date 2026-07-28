// components/admin/subscribers/ImportModal.tsx
// 🏗️ ENTERPRISE SUBSCRIBER IMPORT MODAL — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Drag & drop CSV upload → column preview → import progress
//   → result summary with error download
//
// FEATURES:
//   ✅ Drag & drop + click to browse
//   ✅ File validation (CSV only, max 5MB)
//   ✅ Column mapping preview (first 5 rows)
//   ✅ 2-step confirmation before import
//   ✅ Progress indicator during import
//   ✅ Result summary: imported / skipped / failed counts
//   ✅ Download error report as CSV
//   ✅ Download skipped report as CSV
//   ✅ Body scroll lock on open
//   ✅ Backdrop blur modal
//   ✅ Mobile responsive
//   ✅ No react-hot-toast — inline Banner
//   ✅ Tailwind CSS only
//   ✅ Lucide React icons only
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Download,
  Users,
  SkipForward,
  XCircle,
  Info,
  RefreshCw,
  File,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

interface ImportError {
  row:    number;
  email:  string;
  reason: string;
}

interface SkippedRow {
  row:    number;
  email:  string;
  reason: string;
}

interface ImportResult {
  imported:        number;
  skipped:         number;
  failed:          number;
  errors:          ImportError[];
  skipped_details: SkippedRow[];
  total_processed: number;
}

interface PreviewRow {
  [key: string]: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'result';

interface ImportModalProps {
  onClose:   () => void;
  onSuccess: (imported: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_SIZE_MB  = 5;
const MAX_FILE_SIZE_B   = MAX_FILE_SIZE_MB * 1024 * 1024;
const PREVIEW_ROW_COUNT = 5;

const SKIP_REASON_LABELS: Record<string, string> = {
  already_active:       'Already subscribed',
  already_pending:      'Pending verification',
  already_unsubscribed: 'Previously unsubscribed',
  already_bounced:      'Email bounced',
  duplicate_in_csv:     'Duplicate in CSV',
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Parse CSV string into { headers, rows }
 * Client-side lightweight parser for preview only.
 */
function parseCSVPreview(content: string): {
  headers: string[];
  rows:    PreviewRow[];
  total:   number;
} {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines      = normalized.split('\n').filter((l) => l.trim());

  if (lines.length === 0) return { headers: [], rows: [], total: 0 };

  // Simple split for preview (good enough for display)
  const splitLine = (line: string): string[] => {
    const fields: string[]  = [];
    let current             = '';
    let inQuotes            = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    fields.push(current.trim());
    return fields;
  };

  const headers  = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  const dataLines = lines.slice(1).filter((l) => l.trim());
  const total    = dataLines.length;

  const rows: PreviewRow[] = dataLines
    .slice(0, PREVIEW_ROW_COUNT)
    .map((line) => {
      const values = splitLine(line);
      const row: PreviewRow = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });

  return { headers, rows, total };
}

/**
 * Download a string as a file.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build error report CSV content.
 */
function buildErrorCsv(errors: ImportError[]): string {
  const rows = [
    'row,email,reason',
    ...errors.map(
      (e) => `${e.row},"${e.email.replace(/"/g, '""')}","${e.reason.replace(/"/g, '""')}"`
    ),
  ];
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Build skipped report CSV content.
 */
function buildSkippedCsv(skipped: SkippedRow[]): string {
  const rows = [
    'row,email,reason',
    ...skipped.map(
      (s) => `${s.row},"${s.email.replace(/"/g, '""')}","${
        SKIP_REASON_LABELS[s.reason] || s.reason
      }"`
    ),
  ];
  return '\uFEFF' + rows.join('\r\n');
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── Banner ──────────────────────────────────────────────────

interface BannerProps {
  type:    'error' | 'info' | 'success' | 'warning';
  message: string;
}

function Banner({ type, message }: BannerProps) {
  const styles = {
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  };

  const icons = {
    error:   <XCircle className="w-4 h-4 shrink-0 mt-0.5" />,
    info:    <Info className="w-4 h-4 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────

interface StepIndicatorProps {
  current: Step;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',    label: 'Upload'   },
  { key: 'preview',   label: 'Preview'  },
  { key: 'importing', label: 'Import'   },
  { key: 'result',    label: 'Result'   },
];

function StepIndicator({ current }: StepIndicatorProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-1 justify-center">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-[#029bba] text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:block ${
                  isCurrent ? 'text-[#029bba]' : isDone ? 'text-emerald-500' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mb-4 transition-all ${
                  idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  color: 'green' | 'amber' | 'red' | 'blue';
  icon:  React.ReactNode;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const styles = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50  border-amber-200  text-amber-700',
    red:   'bg-red-50    border-red-200    text-red-700',
    blue:  'bg-blue-50   border-blue-200   text-blue-700',
  };

  const numStyles = {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red:   'text-red-600',
    blue:  'text-blue-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${styles[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-3xl font-black ${numStyles[color]}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  // ─── State ────────────────────────────────────────────────
  const [step,         setStep]         = useState<Step>('upload');
  const [file,         setFile]         = useState<File | null>(null);
  const [csvContent,   setCsvContent]   = useState<string>('');
  const [isDragging,   setIsDragging]   = useState(false);
  const [fileError,    setFileError]    = useState('');
  const [preview,      setPreview]      = useState<{
    headers: string[];
    rows:    PreviewRow[];
    total:   number;
  } | null>(null);
  const [isImporting,  setIsImporting]  = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [result,       setResult]       = useState<ImportResult | null>(null);
  const [importError,  setImportError]  = useState('');

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Body scroll lock ─────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ─── Cleanup timer on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  // ─── File validation & read ───────────────────────────────
  const processFile = useCallback((f: File) => {
    setFileError('');

    // Type check
    if (!f.name.toLowerCase().endsWith('.csv') && f.type !== 'text/csv') {
      setFileError('Only CSV files are supported. Please upload a .csv file.');
      return;
    }

    // Size check
    if (f.size > MAX_FILE_SIZE_B) {
      setFileError(
        `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. ` +
        `Your file is ${(f.size / 1024 / 1024).toFixed(2)}MB.`
      );
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setFileError('Could not read file. Please try again.');
        return;
      }

      // Quick parse for preview
      const parsed = parseCSVPreview(content);

      if (!parsed.headers.includes('email')) {
        setFileError(
          `Required column "email" not found. ` +
          `Found: ${parsed.headers.join(', ') || 'no headers'}`
        );
        return;
      }

      if (parsed.total === 0) {
        setFileError('CSV file has no data rows. Please check your file.');
        return;
      }

      setFile(f);
      setCsvContent(content);
      setPreview(parsed);
      setStep('preview');
    };

    reader.onerror = () => {
      setFileError('Failed to read file. Please try again.');
    };

    reader.readAsText(f, 'UTF-8');
  }, []);

  // ─── Drag & Drop handlers ─────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFile]);

  // ─── Simulated progress bar ───────────────────────────────
  const startProgress = () => {
    setProgress(0);
    let p = 0;
    progressTimer.current = setInterval(() => {
      // Asymptotic approach — slows near 90% to wait for real response
      const increment = p < 30 ? 8 : p < 60 ? 5 : p < 80 ? 2 : p < 90 ? 0.5 : 0;
      p = Math.min(p + increment, 90);
      setProgress(Math.round(p));
    }, 200);
  };

  const finishProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
  };

  // ─── Import handler ───────────────────────────────────────
  const handleImport = async () => {
    if (!csvContent || !file) return;

    setStep('importing');
    setIsImporting(true);
    setImportError('');
    startProgress();

    try {
      const response = await fetch('/api/newsletter/subscribers/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          csvContent,
          fileName: file.name,
        }),
      });

      finishProgress();

      const data = await response.json();

      if (!response.ok || !data.success) {
        setImportError(data.message || 'Import failed. Please try again.');
        setStep('preview');
        setIsImporting(false);
        return;
      }

      setResult(data.result);
      setStep('result');
      setIsImporting(false);

      // Notify parent if any were imported
      if (data.result.imported > 0) {
        onSuccess(data.result.imported);
      }

    } catch {
      finishProgress();
      setImportError('Network error. Please check your connection and try again.');
      setStep('preview');
      setIsImporting(false);
    }
  };

  // ─── Reset to start ───────────────────────────────────────
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setCsvContent('');
    setPreview(null);
    setFileError('');
    setImportError('');
    setResult(null);
    setProgress(0);
  };

  // ─── Download reports ─────────────────────────────────────
  const handleDownloadErrors = () => {
    if (!result?.errors?.length) return;
    const date = new Date().toISOString().split('T')[0];
    downloadFile(
      buildErrorCsv(result.errors),
      `import-errors-${date}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleDownloadSkipped = () => {
    if (!result?.skipped_details?.length) return;
    const date = new Date().toISOString().split('T')[0];
    downloadFile(
      buildSkippedCsv(result.skipped_details),
      `import-skipped-${date}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  // ═══════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#004063]">
              Import Subscribers
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload a CSV file to bulk import newsletter subscribers
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div className="px-6 py-4 border-b border-gray-50 shrink-0">
          <StepIndicator current={step} />
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ════════════════════════════════════════
              STEP 1: UPLOAD
          ════════════════════════════════════════ */}
          {step === 'upload' && (
            <div className="space-y-5">

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 space-y-1">
                    <p className="font-bold">CSV Format Requirements</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                      <li>Required column: <code className="bg-blue-100 px-1 rounded text-xs">email</code></li>
                      <li>Optional columns: <code className="bg-blue-100 px-1 rounded text-xs">name</code>, <code className="bg-blue-100 px-1 rounded text-xs">tags</code>, <code className="bg-blue-100 px-1 rounded text-xs">source</code></li>
                      <li>Tags separated by <code className="bg-blue-100 px-1 rounded text-xs">|</code> or <code className="bg-blue-100 px-1 rounded text-xs">;</code></li>
                      <li>Maximum 10,000 rows per upload</li>
                      <li>Maximum file size: 5MB</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-10
                  flex flex-col items-center justify-center gap-4
                  cursor-pointer transition-all select-none
                  ${isDragging
                    ? 'border-[#029bba] bg-[#029bba]/5 scale-[1.01]'
                    : 'border-gray-200 hover:border-[#029bba] hover:bg-gray-50'
                  }
                `}
              >
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-[#029bba]/10' : 'bg-gray-100'}
                `}>
                  <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-[#029bba]' : 'text-gray-400'}`} />
                </div>

                <div className="text-center">
                  <p className="font-bold text-gray-700 text-base">
                    {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    or <span className="text-[#029bba] font-semibold">click to browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported format: .csv — Max 5MB — Max 10,000 rows
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* File error */}
              {fileError && <Banner type="error" message={fileError} />}

              {/* Sample CSV download */}
              <div className="flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const sample =
                      'email,name,tags,source\n' +
                      'ahmed.khan@example.com,Ahmed Khan,vip|karachi,import\n' +
                      'sara.ali@example.com,Sara Ali,lahore,import\n' +
                      'info@company.pk,Company Info,,import\n';
                    downloadFile(
                      '\uFEFF' + sample,
                      'sample-subscribers.csv',
                      'text/csv;charset=utf-8;'
                    );
                  }}
                  className="flex items-center gap-2 text-sm text-[#029bba] hover:text-[#004063] font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download sample CSV template
                </button>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 2: PREVIEW
          ════════════════════════════════════════ */}
          {step === 'preview' && preview && (
            <div className="space-y-5">

              {/* File info */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-10 h-10 bg-[#029bba]/10 rounded-xl flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-[#029bba]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{file?.name}</p>
                  <p className="text-xs text-gray-500">
                    {preview.total.toLocaleString()} data rows detected
                    {' · '}
                    Columns: {preview.headers.join(', ')}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#029bba] hover:text-[#004063] font-semibold transition-colors shrink-0"
                >
                  Change file
                </button>
              </div>

              {/* Column check */}
              <div className="flex flex-wrap gap-2">
                {['email', 'name', 'tags', 'source'].map((col) => {
                  const found = preview.headers.includes(col);
                  return (
                    <span
                      key={col}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        found
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : col === 'email'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {found
                        ? <CheckCircle className="w-3 h-3" />
                        : col === 'email'
                        ? <XCircle className="w-3 h-3" />
                        : <Info className="w-3 h-3" />
                      }
                      {col}
                      {!found && col !== 'email' && (
                        <span className="text-gray-300 ml-0.5">(optional)</span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Data preview table */}
              {preview.rows.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Preview — First {Math.min(PREVIEW_ROW_COUNT, preview.rows.length)} rows
                  </p>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {preview.headers.map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              {preview.headers.map((h) => (
                                <td
                                  key={h}
                                  className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate"
                                >
                                  {row[h] || (
                                    <span className="text-gray-300 italic text-xs">empty</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.total > PREVIEW_ROW_COUNT && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                        + {(preview.total - PREVIEW_ROW_COUNT).toLocaleString()} more rows not shown
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warning */}
              <Banner
                type="warning"
                message={`${preview.total.toLocaleString()} rows will be processed. Already subscribed, unsubscribed, and bounced emails will be skipped automatically.`}
              />

              {/* Import error */}
              {importError && <Banner type="error" message={importError} />}

            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 3: IMPORTING (progress)
          ════════════════════════════════════════ */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-20 h-20 bg-[#029bba]/10 rounded-2xl flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-[#029bba] animate-spin" />
              </div>

              <div className="text-center">
                <p className="text-xl font-black text-[#004063]">Importing subscribers...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Please wait. Do not close this window.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-[#029bba] to-[#004063] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Processing {preview?.total.toLocaleString() || 0} rows...
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 4: RESULT
          ════════════════════════════════════════ */}
          {step === 'result' && result && (
            <div className="space-y-5">

              {/* Overall status */}
              <div className={`rounded-xl border p-4 flex items-start gap-3 ${
                result.imported > 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                {result.imported > 0
                  ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`font-bold text-sm ${
                    result.imported > 0 ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    {result.imported > 0
                      ? `Import complete! ${result.imported.toLocaleString()} subscriber${result.imported !== 1 ? 's' : ''} added successfully.`
                      : 'Import completed — no new subscribers were added.'
                    }
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    result.imported > 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    Total processed: {result.total_processed.toLocaleString()} rows
                  </p>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Imported"
                  value={result.imported}
                  color="green"
                  icon={<Users className="w-4 h-4" />}
                />
                <StatCard
                  label="Skipped"
                  value={result.skipped}
                  color="amber"
                  icon={<SkipForward className="w-4 h-4" />}
                />
                <StatCard
                  label="Failed"
                  value={result.failed}
                  color={result.failed > 0 ? 'red' : 'blue'}
                  icon={<XCircle className="w-4 h-4" />}
                />
              </div>

              {/* Skipped breakdown */}
              {result.skipped > 0 && result.skipped_details.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-amber-800">
                      Skipped — {result.skipped.toLocaleString()} rows
                    </p>
                    <button
                      onClick={handleDownloadSkipped}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download report
                    </button>
                  </div>

                  {/* Group by reason */}
                  {(() => {
                    const groups: Record<string, number> = {};
                    result.skipped_details.forEach((s) => {
                      const label = SKIP_REASON_LABELS[s.reason] || s.reason;
                      groups[label] = (groups[label] || 0) + 1;
                    });
                    return (
                      <div className="space-y-1.5">
                        {Object.entries(groups).map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <span className="text-amber-700">{label}</span>
                            <span className="font-bold text-amber-800">
                              {count.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Failed breakdown */}
              {result.failed > 0 && result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-red-800">
                      Failed — {result.failed.toLocaleString()} rows
                    </p>
                    <button
                      onClick={handleDownloadErrors}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download error report
                    </button>
                  </div>

                  {/* Show first 5 errors inline */}
                  <div className="space-y-1.5">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-bold text-red-500 shrink-0">
                          Row {err.row}
                        </span>
                        <span className="text-red-400 shrink-0">—</span>
                        <span className="text-red-700 truncate">
                          {err.email || 'N/A'}
                        </span>
                        <span className="text-red-500 shrink-0 ml-auto">
                          {err.reason}
                        </span>
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <p className="text-xs text-red-500 text-center pt-1">
                        +{(result.errors.length - 5).toLocaleString()} more errors — download report for full list
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">

          {/* UPLOAD step footer */}
          {step === 'upload' && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* PREVIEW step footer */}
          {step === 'preview' && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#004063] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import {preview?.total.toLocaleString()} rows
                </button>
              </div>
            </div>
          )}

          {/* IMPORTING step footer */}
          {step === 'importing' && (
            <div className="flex justify-center">
              <p className="text-xs text-gray-400 font-semibold">
                Import in progress — please wait...
              </p>
            </div>
          )}

          {/* RESULT step footer */}
          {step === 'result' && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Import another file
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#029bba] hover:bg-[#004063] transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}