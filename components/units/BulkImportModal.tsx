// components/units/BulkImportModal.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  Trash2,
  Plus,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

type ImportStrategy = 'skip' | 'overwrite' | 'strict';
type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

interface UnitRow {
  unitNumber:   string;
  category:     'residential' | 'commercial';
  unitType:     string;
  area:         number;
  price:        number;
  areaUnit?:    string;
  floorNumber?: number;
  floorName?:   string;
  tower?:       string;
  bedrooms?:    number;
  bathrooms?:   number;
  isCorner?:    boolean;
  facing?:      string;
  status?:      string;
  listingType?: string;
  description?: string;
  [key: string]: unknown;
}

interface ValidationError {
  row:    number;
  field:  string;
  message: string;
}

interface ImportResult {
  success:     boolean;
  total:       number;
  imported:    number;
  skipped:     number;
  overwritten: number;
  failed:      number;
  errors:      Array<{ row: number; unitNumber: string; reason: string }>;
  duration:    number;
}

interface BulkImportModalProps {
  projectId:    string;
  projectName:  string;
  isOpen:       boolean;
  onClose:      () => void;
  onComplete?:  () => void;
}

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════

const MAX_ROWS = 200;

const REQUIRED_COLUMNS = ['unitNumber', 'category', 'unitType', 'area', 'price'];

const ALL_COLUMNS = [
  'unitNumber', 'category', 'unitType', 'area', 'price',
  'areaUnit', 'unitTypeName', 'floorNumber', 'floorName',
  'tower', 'wing', 'building', 'subType',
  'bedrooms', 'bathrooms', 'livingRooms', 'kitchens',
  'isCorner', 'facing', 'view', 'status',
  'listingType', 'finishingLevel', 'parkingIncluded',
  'parkingSpaces', 'description', 'shortDescription',
];

const SAMPLE_CSV = `unitNumber,category,unitType,area,price,areaUnit,floorNumber,tower,bedrooms,bathrooms,isCorner,facing,status,listingType
A-101,residential,apartment_2bed,1200,8500000,Sq.Ft,1,Tower A,2,2,false,north,available,both
A-102,residential,apartment_2bed,1200,8700000,Sq.Ft,1,Tower A,2,2,true,north_east,available,both
A-201,residential,apartment_3bed,1800,12500000,Sq.Ft,2,Tower A,3,3,false,south,available,installment
S-01,commercial,shop,450,5500000,Sq.Ft,0,Tower A,,,true,east,available,full_payment
S-02,commercial,shop,350,4200000,Sq.Ft,0,Tower A,,,false,west,available,both`;

const STRATEGY_OPTIONS: Array<{
  value: ImportStrategy;
  label: string;
  description: string;
  icon:  React.ReactElement;
}> = [
  {
    value: 'skip',
    label: 'Skip Duplicates',
    description: 'Duplicate unit numbers will be skipped. Existing units remain unchanged.',
    icon: <ArrowRight className="w-4 h-4" />,
  },
  {
    value: 'overwrite',
    label: 'Update Existing',
    description: 'Duplicate unit numbers will be updated with new data from CSV.',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    value: 'strict',
    label: 'Strict Mode',
    description: 'Import fails if ANY duplicate unit number is found. All or nothing.',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
];

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function csvRowToUnitRow(row: Record<string, string>, index: number): {
  unit: UnitRow | null;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const rowNum = index + 2; // +2 for header row + 0-index

  // Required fields
  if (!row.unitNumber?.trim()) {
    errors.push({ row: rowNum, field: 'unitNumber', message: 'Unit number is required' });
  }

  const category = (row.category?.trim().toLowerCase() ?? '') as 'residential' | 'commercial';
  if (!['residential', 'commercial'].includes(category)) {
    errors.push({ row: rowNum, field: 'category', message: 'Category must be residential or commercial' });
  }

  if (!row.unitType?.trim()) {
    errors.push({ row: rowNum, field: 'unitType', message: 'Unit type is required' });
  }

  const area = Number(row.area);
  if (!area || area <= 0 || isNaN(area)) {
    errors.push({ row: rowNum, field: 'area', message: 'Valid area is required (positive number)' });
  }

  const price = Number(row.price);
  if (!price || price <= 0 || isNaN(price)) {
    errors.push({ row: rowNum, field: 'price', message: 'Valid price is required (positive number)' });
  }

  if (errors.length > 0) {
    return { unit: null, errors };
  }

  // Optional numeric fields
  const parseNum = (val?: string): number | undefined => {
    if (!val) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };

  const parseBool = (val?: string): boolean | undefined => {
    if (!val) return undefined;
    return val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
  };

  return {
    unit: {
      unitNumber:   row.unitNumber.trim(),
      category,
      unitType:     row.unitType.trim(),
      area,
      price,
      areaUnit:     row.areaUnit?.trim() || 'Sq.Ft',
      floorNumber:  parseNum(row.floorNumber),
      floorName:    row.floorName?.trim() || undefined,
      tower:        row.tower?.trim() || undefined,
      bedrooms:     parseNum(row.bedrooms),
      bathrooms:    parseNum(row.bathrooms),
      isCorner:     parseBool(row.isCorner),
      facing:       row.facing?.trim() || undefined,
      status:       row.status?.trim() || 'available',
      listingType:  row.listingType?.trim() || 'both',
      description:  row.description?.trim() || undefined,
    },
    errors: [],
  };
}

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(1)} Lac`;
  return price.toLocaleString();
}

// ════════════════════════════════════════════════════
// STEP 1: UPLOAD
// ════════════════════════════════════════════════════

function UploadStep({
  onFileProcessed,
  onDownloadSample,
}: {
  onFileProcessed: (units: UnitRow[], errors: ValidationError[]) => void;
  onDownloadSample: () => void;
}): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    setFileError(null);

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];
    const isCSV = validTypes.includes(file.type) ||
                  file.name.endsWith('.csv');

    if (!isCSV) {
      setFileError('Please upload a CSV file (.csv)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
          setFileError('CSV file is empty or has no data rows');
          return;
        }

        if (rows.length > MAX_ROWS) {
          setFileError(`Maximum ${MAX_ROWS} rows allowed. Your file has ${rows.length} rows.`);
          return;
        }

        // Validate required columns
        const missingCols = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missingCols.length > 0) {
          setFileError(`Missing required columns: ${missingCols.join(', ')}`);
          return;
        }

        // Parse rows
        const allUnits: UnitRow[] = [];
        const allErrors: ValidationError[] = [];

        rows.forEach((row, idx) => {
          const { unit, errors } = csvRowToUnitRow(row, idx);
          if (unit) allUnits.push(unit);
          allErrors.push(...errors);
        });

        onFileProcessed(allUnits, allErrors);

      } catch {
        setFileError('Error reading CSV file. Please check the format.');
      }
    };

    reader.onerror = () => {
      setFileError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  }, [onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="p-6">
      {/* Download sample */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-700 mb-1">
              Need a template?
            </p>
            <p className="text-xs text-blue-600 mb-2">
              Download our sample CSV with all supported columns and example data.
            </p>
            <button
              onClick={onDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-blue-100 hover:bg-blue-200 text-blue-700
                         text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center
          transition-all duration-200 cursor-pointer
          ${dragActive
            ? 'border-[#029bba] bg-[#029bba]/5'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                          ${dragActive ? 'bg-[#029bba]/10' : 'bg-gray-100'}`}>
            <FileSpreadsheet className={`w-8 h-8
                                         ${dragActive ? 'text-[#029bba]' : 'text-gray-400'}`} />
          </div>

          <p className="text-base font-bold text-gray-700 mb-1">
            {dragActive ? 'Drop your CSV file here' : 'Upload CSV File'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Drag & drop or click to browse
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-gray-400">
            <span>CSV format only</span>
            <span>·</span>
            <span>Max {MAX_ROWS} rows</span>
            <span>·</span>
            <span>Max 5MB</span>
          </div>
        </div>
      </div>

      {/* File error */}
      {fileError && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100
                        flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{fileError}</p>
        </div>
      )}

      {/* Required columns */}
      <div className="mt-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Required Columns
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_COLUMNS.map((col) => (
            <span key={col} className="px-2.5 py-1 rounded-full bg-red-50 border border-red-100
                                        text-[10px] font-bold text-red-600">
              {col}
            </span>
          ))}
        </div>

        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">
          Optional Columns
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_COLUMNS.filter((c) => !REQUIRED_COLUMNS.includes(c)).map((col) => (
            <span key={col} className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100
                                        text-[10px] font-medium text-gray-500">
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// STEP 2: PREVIEW
// ════════════════════════════════════════════════════

function PreviewStep({
  units,
  validationErrors,
  strategy,
  onStrategyChange,
  onBack,
  onImport,
}: {
  units:             UnitRow[];
  validationErrors:  ValidationError[];
  strategy:          ImportStrategy;
  onStrategyChange:  (s: ImportStrategy) => void;
  onBack:            () => void;
  onImport:          () => void;
}): React.ReactElement {
  const [showErrors, setShowErrors] = useState(false);
  const hasErrors = validationErrors.length > 0;

  return (
    <div className="p-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
          <p className="text-2xl font-black text-emerald-700">{units.length}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Valid Units</p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-2xl font-black text-red-600">{validationErrors.length}</p>
          <p className="text-[10px] font-semibold text-red-500 uppercase">Errors</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
          <p className="text-2xl font-black text-blue-700">{units.length + validationErrors.length}</p>
          <p className="text-[10px] font-semibold text-blue-600 uppercase">Total Rows</p>
        </div>
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div className="mb-6">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex items-center justify-between w-full px-3 py-2.5
                       rounded-xl bg-red-50 border border-red-100
                       text-sm font-semibold text-red-700"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {validationErrors.length} Validation Error{validationErrors.length > 1 ? 's' : ''}
            </span>
            {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showErrors && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-red-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50">
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Row</th>
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Field</th>
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {validationErrors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 text-red-700 font-mono">{err.row}</td>
                      <td className="px-3 py-1.5 text-red-600 font-semibold">{err.field}</td>
                      <td className="px-3 py-1.5 text-red-500">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Strategy selection */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Duplicate Handling Strategy
        </p>
        <div className="space-y-2">
          {STRATEGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStrategyChange(opt.value)}
              className={`
                w-full flex items-start gap-3 p-3 rounded-xl border-2
                transition-all duration-200 text-left
                ${strategy === opt.value
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-100 hover:border-gray-200'
                }
              `}
            >
              <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5
                               ${strategy === opt.value
                                 ? 'bg-[#029bba] text-white'
                                 : 'bg-gray-100 text-gray-400'
                               }`}>
                {opt.icon}
              </div>
              <div>
                <p className={`text-sm font-bold
                               ${strategy === opt.value ? 'text-[#029bba]' : 'text-gray-700'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Preview (First 10 Rows)
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-bold text-gray-500">#</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500">Unit</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500">Type</th>
                <th className="px-3 py-2 text-right font-bold text-gray-500">Area</th>
                <th className="px-3 py-2 text-right font-bold text-gray-500">Price</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500">Floor</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.slice(0, 10).map((unit, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">{unit.unitNumber}</td>
                  <td className="px-3 py-2 text-gray-600">{unit.unitType}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {unit.area} {unit.areaUnit ?? 'sqft'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-[#029bba]">
                    {formatPrice(unit.price)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {unit.floorName ?? (unit.floorNumber !== undefined ? `F${unit.floorNumber}` : '—')}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700
                                     text-[9px] font-bold">
                      {unit.status ?? 'available'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {units.length > 10 && (
            <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 text-center">
              ...and {units.length - 10} more rows
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                     border border-gray-200 bg-white text-gray-700
                     text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onImport}
          disabled={units.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#029bba] to-[#027a94]
                     text-white text-sm font-semibold
                     hover:from-[#02a8c9] hover:to-[#028aaa]
                     hover:shadow-lg transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          Import {units.length} Units
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// STEP 3: IMPORTING
// ════════════════════════════════════════════════════

function ImportingStep({
  total,
}: {
  total: number;
}): React.ReactElement {
  return (
    <div className="p-10 text-center">
      <Loader2 className="w-12 h-12 text-[#029bba] mx-auto mb-4 animate-spin" />
      <h3 className="text-lg font-bold text-gray-700 mb-1">
        Importing {total} Units...
      </h3>
      <p className="text-sm text-gray-400">
        Please wait — yeh kuch seconds le sakta hai
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════
// STEP 4: RESULTS
// ════════════════════════════════════════════════════

function ResultsStep({
  result,
  onClose,
  onImportMore,
}: {
  result:       ImportResult;
  onClose:      () => void;
  onImportMore: () => void;
}): React.ReactElement {
  const [showErrors, setShowErrors] = useState(false);
  const hasErrors = result.errors.length > 0;

  return (
    <div className="p-6">
      {/* Success / partial / failure header */}
      <div className="text-center mb-6">
        {result.imported > 0 || result.overwritten > 0 ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-gray-800">Import Complete!</h3>
          </>
        ) : (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-gray-800">Import Failed</h3>
          </>
        )}
        <p className="text-sm text-gray-400 mt-1">
          Completed in {(result.duration / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
          <p className="text-2xl font-black text-emerald-700">{result.imported}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Imported</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
          <p className="text-2xl font-black text-blue-700">{result.overwritten}</p>
          <p className="text-[10px] font-semibold text-blue-600 uppercase">Updated</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
          <p className="text-2xl font-black text-amber-700">{result.skipped}</p>
          <p className="text-[10px] font-semibold text-amber-600 uppercase">Skipped</p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-2xl font-black text-red-600">{result.failed}</p>
          <p className="text-[10px] font-semibold text-red-500 uppercase">Failed</p>
        </div>
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className="mb-6">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex items-center justify-between w-full px-3 py-2.5
                       rounded-xl bg-red-50 border border-red-100
                       text-sm font-semibold text-red-700"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {result.errors.length} Error{result.errors.length > 1 ? 's' : ''}
            </span>
            {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showErrors && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-red-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50">
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Row</th>
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Unit</th>
                    <th className="px-3 py-1.5 text-left font-bold text-red-600">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {result.errors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 text-red-700 font-mono">{err.row}</td>
                      <td className="px-3 py-1.5 text-red-600 font-semibold">{err.unitNumber}</td>
                      <td className="px-3 py-1.5 text-red-500">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onImportMore}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                     border border-gray-200 bg-white text-gray-700
                     text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Import More
        </button>

        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#029bba] to-[#027a94]
                     text-white text-sm font-semibold
                     hover:from-[#02a8c9] hover:to-[#028aaa]
                     hover:shadow-lg transition-all duration-200"
        >
          <CheckCircle2 className="w-4 h-4" />
          Done
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// PROGRESS INDICATOR
// ════════════════════════════════════════════════════

function StepIndicator({ current }: { current: ImportStep }): React.ReactElement {
  const steps: Array<{ key: ImportStep; label: string }> = [
    { key: 'upload',    label: 'Upload' },
    { key: 'preview',   label: 'Preview' },
    { key: 'importing', label: 'Import' },
    { key: 'results',   label: 'Results' },
  ];

  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-1 px-6 py-3 border-b border-gray-100">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center gap-1.5">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
              ${idx < currentIdx
                ? 'bg-emerald-500 text-white'
                : idx === currentIdx
                ? 'bg-[#029bba] text-white'
                : 'bg-gray-100 text-gray-400'
              }
            `}>
              {idx < currentIdx ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                idx + 1
              )}
            </div>
            <span className={`text-xs font-semibold hidden sm:inline
                              ${idx === currentIdx ? 'text-[#029bba]' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>

          {idx < steps.length - 1 && (
            <div className={`w-8 h-0.5 rounded-full mx-1
                            ${idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function BulkImportModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onComplete,
}: BulkImportModalProps): React.ReactElement | null {
  const [step, setStep]                   = useState<ImportStep>('upload');
  const [units, setUnits]                 = useState<UnitRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [strategy, setStrategy]           = useState<ImportStrategy>('skip');
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);

  // Body scroll lock
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset on open
  React.useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setUnits([]);
      setValidationErrors([]);
      setStrategy('skip');
      setImportResult(null);
    }
  }, [isOpen]);

  // Download sample CSV
  const handleDownloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'highrise-units-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // File processed
  const handleFileProcessed = useCallback((parsedUnits: UnitRow[], errors: ValidationError[]) => {
    setUnits(parsedUnits);
    setValidationErrors(errors);
    setStep('preview');
  }, []);

  // Execute import
  const handleImport = useCallback(async () => {
    setStep('importing');

    try {
      const response = await fetch('/api/units/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          units,
          strategy,
        }),
      });

      const data = await response.json();

      if (data.data) {
        setImportResult(data.data as ImportResult);
      } else {
        setImportResult({
          success:     false,
          total:       units.length,
          imported:    0,
          skipped:     0,
          overwritten: 0,
          failed:      units.length,
          errors:      [{ row: 0, unitNumber: 'ALL', reason: data.message ?? 'Import failed' }],
          duration:    0,
        });
      }

      setStep('results');

    } catch {
      setImportResult({
        success:     false,
        total:       units.length,
        imported:    0,
        skipped:     0,
        overwritten: 0,
        failed:      units.length,
        errors:      [{ row: 0, unitNumber: 'ALL', reason: 'Network error. Please try again.' }],
        duration:    0,
      });
      setStep('results');
    }
  }, [projectId, units, strategy]);

  // Close handler
  const handleClose = useCallback(() => {
    if (importResult && (importResult.imported > 0 || importResult.overwritten > 0)) {
      onComplete?.();
    }
    onClose();
  }, [importResult, onComplete, onClose]);

  // Import more
  const handleImportMore = useCallback(() => {
    setStep('upload');
    setUnits([]);
    setValidationErrors([]);
    setImportResult(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-black/50 backdrop-blur-sm overflow-y-auto py-4 px-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl
                   my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg text-[#004063]">
              Bulk Import Units
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projectName}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400
                       hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <StepIndicator current={step} />

        {/* ── Step content ── */}
        <div className="max-h-[70vh] overflow-y-auto">
          {step === 'upload' && (
            <UploadStep
              onFileProcessed={handleFileProcessed}
              onDownloadSample={handleDownloadSample}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              units={units}
              validationErrors={validationErrors}
              strategy={strategy}
              onStrategyChange={setStrategy}
              onBack={() => setStep('upload')}
              onImport={handleImport}
            />
          )}

          {step === 'importing' && (
            <ImportingStep total={units.length} />
          )}

          {step === 'results' && importResult && (
            <ResultsStep
              result={importResult}
              onClose={handleClose}
              onImportMore={handleImportMore}
            />
          )}
        </div>
      </div>
    </div>
  );
}