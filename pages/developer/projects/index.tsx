// pages/developer/projects/index.tsx
// ═══════════════════════════════════════════════════════════════
// DEVELOPER PROJECTS LIST — Highrise.pk V6.4.5
// Enterprise-grade project listing with stat cards + filters.
// ═══════════════════════════════════════════════════════════════
// ✅ 4 stat cards (Total/Active/Pending/Rejected) click-to-filter
// ✅ Grid / List view toggle
// ✅ Active filter pills with XCircle dismiss
// ✅ Search + type + sort filters
// ✅ Inline delete confirmation (no window.confirm)
// ✅ Better empty states (context-aware messaging)
// ✅ fetch() only — no apiClient
// ✅ No banned patterns
// ✅ TypeScript strict — no any
// ═══════════════════════════════════════════════════════════════

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Building2,
  Plus,
  Search,
  Edit,
  ExternalLink,
  LayoutGrid,
  LayoutList,
  MapPin,
  FolderOpen,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import DeveloperLayout from "@/components/developer/DeveloperLayout";
import { useDeveloperContext } from "@/components/developer/DeveloperContext";

// ============================================
// TYPES
// ============================================

interface Project {
  _id: string;
  slug?: string;
  projectName: string;
  city: string;
  areaName?: string;
  area?: string;
  projectCategory?: string;
  projectNature?: string;
  verificationStatus?: string;
  status?: string;
  featureImageUrl?: string;
  primaryImage?: string;
  isFeatured?: boolean;
  completedProjectsCount?: number;
  activeProjectsCount?: number;
  unitCount?: number;
  createdAt?: string;
}

interface ProjectsApiResponse {
  success: boolean;
  message?: string;
  projects?: Project[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ViewMode = "grid" | "list";
type SortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc";

// ============================================
// CONSTANTS
// ============================================

const PAGE_LIMIT = 12;

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  approved: {
    label: "Approved",
    color: "text-green-700",
    bg: "bg-green-100",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  verified: {
    label: "Verified",
    color: "text-green-700",
    bg: "bg-green-100",
    border: "border-green-200",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    icon: Clock,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
    icon: FileEdit,
  },
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "highrise", label: "High-Rise" },
  { value: "society", label: "Housing Society" },
  { value: "mixed_use", label: "Mixed-Use" },
  { value: "commercial_plaza", label: "Commercial Plaza" },
  { value: "townhouse", label: "Townhouse" },
  { value: "gated_community", label: "Gated Community" },
];

// ============================================
// HELPERS
// ============================================

function getProjectStatus(p: Project): string {
  return (p.verificationStatus ?? p.status ?? "draft").toLowerCase();
}

function getProjectLocation(p: Project): string {
  const area = p.areaName ?? p.area ?? "";
  if (area && p.city) return `${area}, ${p.city}`;
  return p.city ?? area ?? "—";
}

function getProjectImage(p: Project): string | null {
  return p.featureImageUrl ?? p.primaryImage ?? null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }): React.ReactElement {
  const key = status.toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.draft;
  const IconComp = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <IconComp className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  onClick?: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-200 hover:shadow-md ${
        active
          ? "border-[#029bba] ring-2 ring-[#029bba]/20 shadow-[#029bba]/10"
          : "border-gray-200 hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold truncate">
          {label}
        </p>
        <p className="text-2xl font-black text-[#004063] leading-tight">
          {value}
        </p>
      </div>
      {active && (
        <div className="ml-auto shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#029bba]" />
        </div>
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function ProjectsSkeleton({
  view,
}: {
  view: ViewMode;
}): React.ReactElement {
  if (view === "list") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="h-44 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-9 bg-gray-100 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Project Grid Card ─────────────────────────────────────────
function ProjectGridCard({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (id: string, name: string) => void;
}): React.ReactElement {
  const image = getProjectImage(project);
  const location = getProjectLocation(project);
  const status = getProjectStatus(project);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={project.projectName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <LayoutGrid className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={status} />
        </div>

        {/* Category badge */}
        {project.projectCategory && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white capitalize">
              {project.projectCategory.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-[#004063] truncate mb-1">
          {project.projectName}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {project.unitCount !== undefined && (
          <p className="text-xs text-gray-400 mb-3">
            {project.unitCount} units
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
          <Link
            href={`/developer/projects/${project._id}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 hover:border-[#029bba] hover:bg-[#029bba]/5 text-xs font-semibold text-[#333333] hover:text-[#029bba] transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </Link>

          {project.slug && (
            <Link
              href={`/projects/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Link>
          )}

          <button
            type="button"
            onClick={() =>
              onDeleteRequest(project._id, project.projectName)
            }
            className="p-2 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Delete project"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project List Row ──────────────────────────────────────────
function ProjectListRow({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest: (id: string, name: string) => void;
}): React.ReactElement {
  const image = getProjectImage(project);
  const location = getProjectLocation(project);
  const status = getProjectStatus(project);

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={project.projectName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#004063] truncate">
          {project.projectName}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{location}</span>
          {project.projectCategory && (
            <>
              <span className="text-gray-300">·</span>
              <span className="capitalize">
                {project.projectCategory.replace(/_/g, " ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="hidden md:block text-xs text-gray-400 shrink-0">
        {formatDate(project.createdAt)}
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {project.slug && (
          <Link
            href={`/projects/${project.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#029bba] transition-colors"
            aria-label="View live"
            title="View live"
          >
            <Eye className="w-4 h-4" />
          </Link>
        )}
        <Link
          href={`/developer/projects/${project._id}/edit`}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#029bba] transition-colors"
          aria-label="Edit project"
          title="Edit project"
        >
          <Edit className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={() =>
            onDeleteRequest(project._id, project.projectName)
          }
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete project"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PROJECTS LIST
// ============================================

function ProjectsList(): React.ReactElement {
  const router = useRouter();
  const { profile } = useDeveloperContext();

  // ── State ─────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filters ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  // ── Delete state ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBanner, setDeleteBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Banner for inline notifications ──────────────────────
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Read status from query param (from dashboard click)
  useEffect(() => {
    const s = router.query.status;
    if (typeof s === "string" && s !== "all") {
      setStatusFilter(s);
    }
  }, [router.query.status]);

  // ── Fetch projects ────────────────────────────────────────
  const fetchProjects = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(
        `/api/developer/projects?${params.toString()}`,
        { credentials: "include" }
      );

      const data = (await res.json()) as ProjectsApiResponse;

      if (!res.ok || !data.success) {
        setError(data.message ?? "Failed to load projects.");
        setProjects([]);
        return;
      }

      setProjects(data.projects ?? []);
      setTotalCount(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Auto-dismiss banners
  useEffect(() => {
    if (banner?.type === "success") {
      const t = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  useEffect(() => {
    if (deleteBanner?.type === "success") {
      const t = setTimeout(() => setDeleteBanner(null), 4000);
      return () => clearTimeout(t);
    }
  }, [deleteBanner]);

  // ── Client-side filter + sort ─────────────────────────────
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          (p.areaName ?? p.area ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
          );
        case "name_asc":
          return a.projectName.localeCompare(b.projectName);
        case "name_desc":
          return b.projectName.localeCompare(a.projectName);
        default: // newest
          return (
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
          );
      }
    });

    return result;
  }, [projects, searchQuery, sortBy]);

  // ── Derived stat counts ───────────────────────────────────
  const statCounts = useMemo(() => {
    // Use totalCount from API for "all" and filtered counts from loaded data
    const all = totalCount;
    const active = projects.filter((p) => {
      const s = getProjectStatus(p);
      return s === "approved" || s === "verified";
    }).length;
    const pending = projects.filter(
      (p) => getProjectStatus(p) === "pending"
    ).length;
    const rejected = projects.filter(
      (p) => getProjectStatus(p) === "rejected"
    ).length;
    return { all, active, pending, rejected };
  }, [projects, totalCount]);

  // ── Active filters list ───────────────────────────────────
  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = [];
    if (statusFilter) {
      const cfg = STATUS_CONFIG[statusFilter];
      filters.push({
        label: `Status: ${cfg?.label ?? statusFilter}`,
        onRemove: () => {
          setStatusFilter("");
          setPage(1);
        },
      });
    }
    if (categoryFilter) {
      const opt = CATEGORY_OPTIONS.find(
        (o) => o.value === categoryFilter
      );
      filters.push({
        label: `Category: ${opt?.label ?? categoryFilter}`,
        onRemove: () => {
          setCategoryFilter("");
          setPage(1);
        },
      });
    }
    if (searchQuery.trim()) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery(""),
      });
    }
    return filters;
  }, [statusFilter, categoryFilter, searchQuery]);

  // ── Delete handler ────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/developer/projects?projectId=${deleteTarget.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (res.ok && data.success) {
        // Optimistic removal
        setProjects((prev) =>
          prev.filter((p) => p._id !== deleteTarget.id)
        );
        setTotalCount((prev) => Math.max(0, prev - 1));
        setDeleteBanner({
          type: "success",
          message: `"${deleteTarget.name}" deleted successfully.`,
        });
      } else {
        setDeleteBanner({
          type: "error",
          message: data.message ?? "Failed to delete project.",
        });
      }
    } catch {
      setDeleteBanner({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleting]);

  const isApproved = profile?.status === "approved";

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Page Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063] flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-[#029bba]" />
              My Projects
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalCount > 0
                ? `${totalCount} project${totalCount !== 1 ? "s" : ""} in your portfolio`
                : "Your project portfolio"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchProjects()}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Refresh projects"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/developer/projects/new"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
                isApproved
                  ? "bg-[#029bba] hover:bg-[#027a94] text-white shadow-[#029bba]/20"
                  : "bg-gray-300 text-white cursor-not-allowed"
              }`}
              aria-disabled={!isApproved}
              title={
                isApproved
                  ? "Add new project"
                  : "Profile approval required"
              }
            >
              <Plus className="w-4 h-4" />
              Add Project
            </Link>
          </div>
        </div>

        {/* ── Inline Banners ────────────────────────────────── */}
        {(banner ?? deleteBanner) && (
          <div
            className={`rounded-xl p-4 flex items-center gap-3 border-l-4 ${
              (banner ?? deleteBanner)?.type === "success"
                ? "bg-[#f0fdf4] border-[#10b981]"
                : "bg-[#fef2f2] border-[#ef4444]"
            }`}
          >
            {(banner ?? deleteBanner)?.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-[#ef4444] shrink-0" />
            )}
            <p
              className={`text-sm font-semibold flex-1 ${
                (banner ?? deleteBanner)?.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }`}
            >
              {(banner ?? deleteBanner)?.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setBanner(null);
                setDeleteBanner(null);
              }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        {/* ── Delete Confirmation Banner ────────────────────── */}
        {deleteTarget && (
          <div className="bg-amber-50 border-l-4 border-[#f59e0b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Delete "{deleteTarget.name}"?
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Projects"
            value={statCounts.all}
            icon={FolderOpen}
            iconBg="bg-[#029bba]/10"
            iconColor="text-[#029bba]"
            active={statusFilter === ""}
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
          />
          <StatCard
            label="Active"
            value={statCounts.active}
            icon={CheckCircle2}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            active={statusFilter === "approved"}
            onClick={() => {
              setStatusFilter("approved");
              setPage(1);
            }}
          />
          <StatCard
            label="Pending Review"
            value={statCounts.pending}
            icon={Clock}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            active={statusFilter === "pending"}
            onClick={() => {
              setStatusFilter("pending");
              setPage(1);
            }}
          />
          <StatCard
            label="Rejected"
            value={statCounts.rejected}
            icon={XCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
            active={statusFilter === "rejected"}
            onClick={() => {
              setStatusFilter("rejected");
              setPage(1);
            }}
          />
        </div>

        {/* ── Filter + View Bar ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, city, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all text-sm"
              />
            </div>

            {/* Filter toggle (mobile) */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                showFilters
                  ? "border-[#029bba] text-[#029bba] bg-[#029bba]/5"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters.length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#029bba] text-white text-[10px] font-bold rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* Desktop filters */}
            <div className="hidden md:flex items-center gap-2">
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] outline-none text-sm bg-white text-gray-700 cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#029bba] outline-none text-sm bg-white text-gray-700 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* View toggle */}
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#029bba] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-[#029bba] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  aria-label="List view"
                  title="List view"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile expanded filters */}
          {showFilters && (
            <div className="md:hidden flex flex-col gap-2 pt-2 border-t border-gray-100">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* View toggle mobile */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    viewMode === "grid"
                      ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    viewMode === "list"
                      ? "border-[#029bba] bg-[#029bba]/5 text-[#029bba]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>
          )}

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {activeFilters.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#029bba]/10 text-[#029bba] text-xs font-semibold rounded-full border border-[#029bba]/20"
                >
                  {f.label}
                  <button
                    type="button"
                    onClick={f.onRemove}
                    aria-label={`Remove filter: ${f.label}`}
                    className="hover:text-[#ef4444] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Clear all */}
              {activeFilters.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("");
                    setCategoryFilter("");
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-gray-400 hover:text-[#ef4444] transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Error State ───────────────────────────────────── */}
        {error && (
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-[#ef4444] shrink-0" />
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchProjects()}
              className="text-sm font-bold text-[#029bba] hover:underline whitespace-nowrap"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Projects Content ──────────────────────────────── */}
        {loading ? (
          <ProjectsSkeleton view={viewMode} />
        ) : filteredProjects.length === 0 && !error ? (
          // ── Empty State ──────────────────────────────────
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeFilters.length > 0 ? (
                <Search className="w-8 h-8 text-gray-300" />
              ) : (
                <Building2 className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <h3 className="text-lg font-bold text-[#004063] mb-2">
              {activeFilters.length > 0
                ? "No projects match your filters"
                : "No projects yet"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {activeFilters.length > 0
                ? "Try removing some filters to see more results."
                : isApproved
                ? "Get started by adding your first project to the portfolio."
                : "Your profile needs to be approved before you can add projects."}
            </p>
            {activeFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setCategoryFilter("");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            ) : isApproved ? (
              <Link
                href="/developer/projects/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] hover:bg-[#027a94] text-white font-bold rounded-xl shadow-md text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Project
              </Link>
            ) : null}
          </div>
        ) : viewMode === "grid" ? (
          // ── Grid View ──────────────────────────────────────
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <ProjectGridCard
                key={project._id}
                project={project}
                onDeleteRequest={(id, name) =>
                  setDeleteTarget({ id, name })
                }
              />
            ))}
          </div>
        ) : (
          // ── List View ──────────────────────────────────────
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* List header */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-12 shrink-0" />
                <div className="flex-1">Project</div>
                <div className="hidden md:block w-24 text-center shrink-0">
                  Date
                </div>
                <div className="w-24 text-center shrink-0">Status</div>
                <div className="w-24 text-right shrink-0">Actions</div>
              </div>
            </div>

            {filteredProjects.map((project) => (
              <ProjectListRow
                key={project._id}
                project={project}
                onDeleteRequest={(id, name) =>
                  setDeleteTarget({ id, name })
                }
              />
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────── */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-bold text-[#004063]">
                {(page - 1) * PAGE_LIMIT + 1}–
                {Math.min(page * PAGE_LIMIT, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-[#004063]">
                {totalCount}
              </span>{" "}
              projects
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Page number pills */}
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                          pageNum === page
                            ? "bg-[#029bba] text-white shadow-sm"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PAGE EXPORT
// ============================================

export default function DeveloperProjectsPage(): React.ReactElement {
  return (
    <DeveloperLayout pageTitle="My Projects">
      <Head>
        <title>My Projects — Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <ProjectsList />
    </DeveloperLayout>
  );
}