import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import { getOptimizedImageUrl } from "@/utils/cloudinaryTransform";
import {
  Image as ImageIcon,
  Plus,
  Search,
  Loader2,
  ExternalLink,
  Calendar,
  Eye,
  MousePointerClick,
  ShieldCheck,
  Megaphone,
  RefreshCw,
  Pencil,
  Trash2,
  Power,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";

interface HeroBannerItem {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  targetType: "internal" | "external" | "project" | "property" | "developer";
  targetId?: string;
  displayOrder: number;
  isActive: boolean;
  isPaidPromotion: boolean;
  sponsorName?: string;
  startDate?: string | null;
  endDate?: string | null;
  impressions?: number;
  clicks?: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface HeroBannerApiResponse {
  success: boolean;
  banners?: HeroBannerItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

interface CreateBannerForm {
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  ctaText: string;
  ctaLink: string;
  targetType: "internal" | "external" | "project" | "property" | "developer";
  targetId: string;
  displayOrder: number;
  isActive: boolean;
  isPaidPromotion: boolean;
  sponsorName: string;
  startDate: string;
  endDate: string;
}


const defaultForm: CreateBannerForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  ctaText: "",
  ctaLink: "",
  targetType: "internal",
  targetId: "",
  displayOrder: 0,
  isActive: true,
  isPaidPromotion: false,
  sponsorName: "",
  startDate: "",
  endDate: "",
};

// ─── Protected Highrise Upload (server-side Cloudinary) ──────────────────────
async function uploadToHighrise(
  file: File,
  folder: 'hero-banners-desktop' | 'hero-banners-mobile',
  onProgress?: (pct: number) => void
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data?.success && data?.data?.url && data?.data?.publicId) {
          resolve({ url: data.data.url, publicId: data.data.publicId });
          return;
        }
        reject(new Error(data?.error || `Upload failed with status ${xhr.status}`));
      } catch {
        reject(new Error('Invalid upload response'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

    xhr.open('POST', `/api/upload?folder=${encodeURIComponent(folder)}`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

// ─── Image Upload Zone Component ─────────────────────────────────────────────
interface ImageUploadZoneProps {
  label: string;
  hint: string;
  aspectClass: string;
  value: string;
  uploading: boolean;
  progress: number;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  accept?: string;
}

function ImageUploadZone({
  label,
  hint,
  aspectClass,
  value,
  uploading,
  progress,
  onFileSelect,
  onClear,
  accept = "image/jpeg,image/png,image/webp",
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className={`relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 ${aspectClass}`}>
        <img
  src={getOptimizedImageUrl(value, { width: 600 })}
  alt="Preview"
  className="w-full h-full object-cover"
/>
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          {hint}
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
  if (uploading) return;
  toast.loading("Opening file picker...", { id: "file-picker" });
  setTimeout(() => {
    inputRef.current?.click();
    toast.dismiss("file-picker");
  }, 100);
}}
      className={`
        relative ${aspectClass} rounded-xl border-2 border-dashed transition-all cursor-pointer
        flex flex-col items-center justify-center gap-3 select-none
        ${dragging
          ? "border-[#029bba] bg-[#029bba]/5 scale-[1.01]"
          : "border-slate-300 bg-slate-50 hover:border-[#029bba] hover:bg-[#029bba]/5"
        }
        ${uploading ? "pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3 px-6 w-full">
          <Loader2 className="w-9 h-9 text-[#029bba] animate-spin" />
          <div className="w-full max-w-[180px]">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Uploading...</span>
              <span className="font-semibold text-[#029bba]">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#029bba] to-[#027a94] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 text-center pointer-events-none">
          <div className={`rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-[#029bba]/20 text-[#029bba]" : "bg-slate-200 text-slate-400"} w-14 h-14`}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
            <p className="text-xs text-slate-400">
  JPG, PNG, WebP · Max 5MB · Use small folders for faster browsing
</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function HeroBannersContent() {
  const [banners, setBanners] = useState<HeroBannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "trash">("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "true" | "false">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBannerForm>(defaultForm);
  const [trashCount, setTrashCount] = useState(0);

  // Upload states
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [desktopProgress, setDesktopProgress] = useState(0);
  const [mobileProgress, setMobileProgress] = useState(0);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<HeroBannerItem | null>(null);
  const [deleteMode, setDeleteMode] = useState<"trash" | "permanent">("trash");

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalImpressions = useMemo(
    () => banners.reduce((sum, b) => sum + (b.impressions || 0), 0),
    [banners]
  );
  const totalClicks = useMemo(
    () => banners.reduce((sum, b) => sum + (b.clicks || 0), 0),
    [banners]
  );
  const activeCount = useMemo(
    () => banners.filter((b) => b.isActive).length,
    [banners]
  );
  const paidCount = useMemo(
    () => banners.filter((b) => b.isPaidPromotion).length,
    [banners]
  );
  const overallCTR = useMemo(() => {
    if (totalImpressions === 0) return "0.00";
    return ((totalClicks / totalImpressions) * 100).toFixed(2);
  }, [totalImpressions, totalClicks]);

  // ── Fetch banners ──────────────────────────────────────────────────────────
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "50");
      params.set("status", statusFilter);
      params.set("paid", paidFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/hero-banners?${params}`, {
        credentials: "include",
      });
      const data: HeroBannerApiResponse = await res.json();

      if (data.success && data.banners) {
        setBanners(data.banners);
      } else {
        setBanners([]);
        toast.error(data.message || "Failed to load hero promotions");
      }
    } catch {
      setBanners([]);
      toast.error("Failed to load hero promotions");
    } finally {
      setLoading(false);
    }

    // Background: fetch trash count
    if (statusFilter !== "trash") {
      try {
        const tr = await fetch("/api/admin/hero-banners?status=trash&limit=1", {
          credentials: "include",
        });
        const td = await tr.json();
        if (td.success && td.pagination) setTrashCount(td.pagination.total || 0);
      } catch {
        // silent
      }
    }
  };

  useEffect(() => { fetchBanners(); }, [statusFilter, paidFilter]);

  // ── Direct upload handlers ─────────────────────────────────────────────────
  const handleDesktopFileSelect = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP files are allowed");
        return;
      }

      setUploadingDesktop(true);
      setDesktopProgress(0);

      try {
        const result = await uploadToHighrise(
          file,
          'hero-banners-desktop',
          setDesktopProgress
        );
        setForm((prev) => ({ ...prev, imageUrl: result.url }));
        toast.success("Desktop image uploaded successfully");
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload desktop image");
      } finally {
        setUploadingDesktop(false);
        setDesktopProgress(0);
      }
    },
    []
  );

  const handleMobileFileSelect = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP files are allowed");
        return;
      }

      setUploadingMobile(true);
      setMobileProgress(0);

      try {
        const result = await uploadToHighrise(
          file,
          'hero-banners-mobile',
          setMobileProgress
        );
        setForm((prev) => ({ ...prev, mobileImageUrl: result.url }));
        toast.success("Mobile image uploaded successfully");
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload mobile image");
      } finally {
        setUploadingMobile(false);
        setMobileProgress(0);
      }
    },
    []
  );

  // ── Form helpers ───────────────────────────────────────────────────────────
  const updateForm = <K extends keyof CreateBannerForm>(
    key: K,
    value: CreateBannerForm[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      toast.error("Please upload a desktop banner image");
      return;
    }
    setSubmitting(true);
    try {
      const isEditing = Boolean(editingBannerId);
      const res = await fetch(
        isEditing
          ? `/api/admin/hero-banners/${editingBannerId}`
          : "/api/admin/hero-banners",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(
          isEditing
            ? "Hero promotion updated successfully"
            : "Hero promotion created successfully"
        );
        setForm(defaultForm);
        setEditingBannerId(null);
        setShowCreateForm(false);
        fetchBanners();
      } else {
        toast.error(data.message || "Failed to save hero promotion");
      }
    } catch {
      toast.error("Failed to save hero promotion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (banner: HeroBannerItem) => {
    setEditingBannerId(banner._id);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      mobileImageUrl: banner.mobileImageUrl || "",
      ctaText: banner.ctaText || "",
      ctaLink: banner.ctaLink || "",
      targetType: banner.targetType || "internal",
      targetId: banner.targetId || "",
      displayOrder: banner.displayOrder || 0,
      isActive: banner.isActive,
      isPaidPromotion: banner.isPaidPromotion,
      sponsorName: banner.sponsorName || "",
      startDate: banner.startDate
        ? new Date(banner.startDate).toISOString().slice(0, 16)
        : "",
      endDate: banner.endDate
        ? new Date(banner.endDate).toISOString().slice(0, 16)
        : "",
    });
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleStatus = async (bannerId: string) => {
    setActionLoadingId(bannerId);
    try {
      const res = await fetch(`/api/admin/hero-banners/${bannerId}`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Banner status updated");
        fetchBanners();
      } else {
        toast.error(data.message || "Failed to update banner status");
      }
    } catch {
      toast.error("Failed to update banner status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (bannerId: string) => {
    setActionLoadingId(bannerId);
    try {
      const res = await fetch(
        `/api/admin/hero-banners/${bannerId}?action=restore`,
        { method: "PATCH", credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Banner restored successfully");
        fetchBanners();
      } else {
        toast.error(data.message || "Failed to restore banner");
      }
    } catch {
      toast.error("Failed to restore banner");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Delete modal ───────────────────────────────────────────────────────────
  const openDeleteModal = (banner: HeroBannerItem) => {
    setBannerToDelete(banner);
    setDeleteMode(statusFilter === "trash" ? "permanent" : "trash");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (actionLoadingId) return;
    setBannerToDelete(null);
    setDeleteMode("trash");
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    const bannerId = bannerToDelete._id;
    setActionLoadingId(bannerId);
    try {
      const url =
        deleteMode === "permanent"
          ? `/api/admin/hero-banners/${bannerId}?permanent=true`
          : `/api/admin/hero-banners/${bannerId}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Banner deleted successfully");
        if (editingBannerId === bannerId) {
          setEditingBannerId(null);
          setForm(defaultForm);
          setShowCreateForm(false);
        }
        setDeleteModalOpen(false);
        setBannerToDelete(null);
        setDeleteMode("trash");
        fetchBanners();
      } else {
        toast.error(data.message || "Failed to delete banner");
      }
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const calculateCTR = (impressions: number, clicks: number) => {
    if (!impressions) return "0.00";
    return ((clicks / impressions) * 100).toFixed(2);
  };

  const getScheduleStatus = (
    banner: HeroBannerItem
  ): { label: string; color: string } => {
    const now = new Date();
    const start = banner.startDate ? new Date(banner.startDate) : null;
    const end = banner.endDate ? new Date(banner.endDate) : null;
    if (end && now > end) return { label: "Expired", color: "bg-red-100 text-red-700" };
    if (start && now < start) return { label: "Scheduled", color: "bg-blue-100 text-blue-700" };
    if (banner.isActive) return { label: "Live", color: "bg-emerald-100 text-emerald-700" };
    return { label: "Inactive", color: "bg-slate-200 text-slate-600" };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      <style jsx global>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-semibold mb-3">
            <Megaphone className="w-4 h-4" />
            Homepage Promotions
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Hero Promotions
          </h1>
          <p className="text-slate-500 mt-1">
            Manage homepage hero banners, paid promotions, and campaign visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchBanners}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          {/* Trash toggle */}
          <button
            type="button"
            onClick={() => {
              if (statusFilter === "trash") {
                setStatusFilter("all");
              } else {
                setStatusFilter("trash");
                setShowCreateForm(false);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-all ${
              statusFilter === "trash"
                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {statusFilter === "trash" ? "Exit Trash" : "Trash"}
            {statusFilter !== "trash" && trashCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600 leading-none">
                {trashCount}
              </span>
            )}
          </button>

          {statusFilter !== "trash" && (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-medium hover:shadow-lg hover:shadow-[#029bba]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              {showCreateForm ? "Close Form" : "Add Hero Promotion"}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{banners.length}</p>
          <p className="text-sm text-slate-500 mt-1">Hero banners</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Live</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
          <p className="text-sm text-slate-500 mt-1">Active promotions</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Reach</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalImpressions}</p>
          <p className="text-sm text-slate-500 mt-1">Tracked impressions</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#004063]/10 text-[#004063] flex items-center justify-center">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Clicks</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalClicks}</p>
          <p className="text-sm text-slate-500 mt-1">
            {overallCTR}% CTR · {paidCount} paid
          </p>
        </Card>
      </div>

      {/* ── Trash Mode Banner ── */}
      {statusFilter === "trash" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Trash View</p>
            <p className="text-sm text-red-600">
              Showing deleted hero promotions. You can restore them or delete permanently.
            </p>
          </div>
        </div>
      )}

      {/* ── Create / Edit Form ── */}
      {showCreateForm && statusFilter !== "trash" && (
        <Card className="p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingBannerId ? "Edit Hero Promotion" : "Create Hero Promotion"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {editingBannerId
                  ? "Update the selected homepage hero banner."
                  : "Add a paid or organic banner for the homepage hero section."}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Title + Sponsor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Luxury Apartments in Islamabad"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sponsor Name
                </label>
                <input
                  type="text"
                  value={form.sponsorName}
                  onChange={(e) => updateForm("sponsorName", e.target.value)}
                  placeholder="ABC Developers"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Subtitle
              </label>
              <textarea
                value={form.subtitle}
                onChange={(e) => updateForm("subtitle", e.target.value)}
                placeholder="Premium inventory with flexible payment plans and verified documentation."
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none resize-none"
              />
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Desktop */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Desktop Banner Image <span className="text-red-500">*</span>
                </label>
                <ImageUploadZone
                  label="Desktop Image"
                  hint="1920×1080 recommended"
                  aspectClass="aspect-[16/9]"
                  value={form.imageUrl}
                  uploading={uploadingDesktop}
                  progress={desktopProgress}
                  onFileSelect={handleDesktopFileSelect}
                  onClear={() => updateForm("imageUrl", "")}
                />
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => updateForm("imageUrl", e.target.value)}
                  placeholder="Or paste image URL..."
                  className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mobile Banner Image{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <ImageUploadZone
                  label="Mobile Image"
                  hint="1080×1920 recommended"
                  aspectClass="aspect-[9/16]"
                  value={form.mobileImageUrl}
                  uploading={uploadingMobile}
                  progress={mobileProgress}
                  onFileSelect={handleMobileFileSelect}
                  onClear={() => updateForm("mobileImageUrl", "")}
                />
                <input
                  type="url"
                  value={form.mobileImageUrl}
                  onChange={(e) => updateForm("mobileImageUrl", e.target.value)}
                  placeholder="Or paste image URL..."
                  className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  CTA Text
                </label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => updateForm("ctaText", e.target.value)}
                  placeholder="Explore Now"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  CTA Link
                </label>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(e) => updateForm("ctaLink", e.target.value)}
                  placeholder="/projects/your-project-slug or https://..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Type
                </label>
                <select
                  value={form.targetType}
                  onChange={(e) =>
                    updateForm(
                      "targetType",
                      e.target.value as CreateBannerForm["targetType"]
                    )
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                  <option value="project">Project</option>
                  <option value="property">Property</option>
                  <option value="developer">Developer</option>
                </select>
              </div>
            </div>

            {/* Order / Dates / Target ID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={(e) =>
                    updateForm("displayOrder", Number(e.target.value))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => updateForm("endDate", e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target ID
                </label>
                <input
                  type="text"
                  value={form.targetId}
                  onChange={(e) => updateForm("targetId", e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateForm("isActive", e.target.checked)}
                  className="w-4 h-4 accent-[#029bba]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Active Banner</p>
                  <p className="text-xs text-slate-500">
                    Show this banner on homepage when valid
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPaidPromotion}
                  onChange={(e) =>
                    updateForm("isPaidPromotion", e.target.checked)
                  }
                  className="w-4 h-4 accent-[#029bba]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Paid Promotion</p>
                  <p className="text-xs text-slate-500">
                    Mark as sponsored homepage placement
                  </p>
                </div>
              </label>
            </div>

            {/* Submit */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || uploadingDesktop || uploadingMobile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-medium hover:shadow-lg hover:shadow-[#029bba]/20 transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editingBannerId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {editingBannerId ? "Update Promotion" : "Create Promotion"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(defaultForm);
                  setEditingBannerId(null);
                  setShowCreateForm(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              {(uploadingDesktop || uploadingMobile) && (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#029bba]" />
                  Uploading image, please wait...
                </p>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* ── Filters ── */}
      <Card className="p-4 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchBanners()}
              placeholder="Search by title, sponsor, CTA..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "active" | "inactive" | "trash"
              )
            }
            className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="trash">Trash</option>
          </select>

          <div className="flex gap-3">
            <select
              value={paidFilter}
              onChange={(e) =>
                setPaidFilter(e.target.value as "all" | "true" | "false")
              }
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            >
              <option value="all">All Types</option>
              <option value="true">Paid Only</option>
              <option value="false">Organic Only</option>
            </select>

            <button
              type="button"
              onClick={fetchBanners}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </Card>

      {/* ── Banners List ── */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-900">
            {statusFilter === "trash"
              ? "Trash — Hero Banners"
              : "Current Hero Banners"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === "trash"
              ? "Restore or permanently delete removed hero promotions."
              : "Review active placements, paid promotions, and banner performance."}
          </p>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : banners.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {banners.map((banner) => (
              <div
                key={banner._id}
                className="p-5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
                  {/* Thumbnail */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/10]">
                    {banner.imageUrl ? (
  <img
    src={getOptimizedImageUrl(banner.imageUrl, {
      width: 800,
      watermark: false,
    })}
    alt={banner.title}
    className="w-full h-full object-cover"
  />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="min-w-0">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#029bba]">
                            Order #{banner.displayOrder}
                          </span>

                          {(() => {
                            const s = getScheduleStatus(banner);
                            return (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
                                {s.label}
                              </span>
                            );
                          })()}

                          {statusFilter === "trash" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              In Trash
                            </span>
                          )}

                          {banner.isPaidPromotion && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              Paid Promotion
                            </span>
                          )}

                          {(banner.impressions || 0) > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              {calculateCTR(
                                banner.impressions || 0,
                                banner.clicks || 0
                              )}
                              % CTR
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {banner.title}
                        </h3>

                        {banner.subtitle && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {banner.subtitle}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {banner.startDate
                              ? new Date(banner.startDate).toLocaleDateString()
                              : "No start date"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {banner.impressions || 0} impressions
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            {banner.clicks || 0} clicks
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="xl:text-right">
                        {banner.sponsorName && (
                          <p className="text-sm font-medium text-slate-700">
                            Sponsor:{" "}
                            <span className="text-slate-900">
                              {banner.sponsorName}
                            </span>
                          </p>
                        )}

                        {banner.ctaLink && (
                          <a
                            href={banner.ctaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-[#029bba] hover:text-[#027a94] mt-2"
                          >
                            View CTA Link
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <div className="flex flex-wrap xl:justify-end gap-2 mt-4">
                          {statusFilter === "trash" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestore(banner._id)}
                                disabled={actionLoadingId === banner._id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm disabled:opacity-60"
                              >
                                {actionLoadingId === banner._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                                Restore
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteModal(banner)}
                                disabled={actionLoadingId === banner._id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm disabled:opacity-60"
                              >
                                {actionLoadingId === banner._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Delete Permanently
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(banner)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(banner._id)}
                                disabled={actionLoadingId === banner._id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm disabled:opacity-60"
                              >
                                {actionLoadingId === banner._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                                {banner.isActive ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteModal(banner)}
                                disabled={actionLoadingId === banner._id}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm disabled:opacity-60"
                              >
                                {actionLoadingId === banner._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center mx-auto mb-4">
              {statusFilter === "trash" ? (
                <Trash2 className="w-7 h-7" />
              ) : (
                <ImageIcon className="w-7 h-7" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {statusFilter === "trash"
                ? "Trash is Empty"
                : "No Hero Promotions Found"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {statusFilter === "trash"
                ? "No deleted banners found. Deleted banners will appear here."
                : "Create your first homepage hero banner to start promoting a project or property."}
            </p>
          </div>
        )}
      </Card>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModalOpen && bannerToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!actionLoadingId) closeDeleteModal();
            }}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: "modalFadeIn 0.2s ease-out" }}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center">
                {deleteMode === "permanent"
                  ? "Permanently Delete Hero Promotion?"
                  : "Move Hero Promotion to Trash?"}
              </h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                {deleteMode === "permanent"
                  ? "This action cannot be undone. The banner and its Cloudinary images will be permanently removed."
                  : "The banner will be moved to trash. You can restore it later or delete it permanently from trash."}
              </p>
            </div>

            {/* Preview */}
            <div className="mx-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                {bannerToDelete.imageUrl ? (
  <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
    <img
  src={getOptimizedImageUrl(bannerToDelete.imageUrl, {
    width: 400,
    watermark: false,
  })}
  alt={bannerToDelete.title}
  className="w-full h-full object-cover"
/>
                    </div>
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {bannerToDelete.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bannerToDelete.impressions || 0} impressions ·{" "}
                    {bannerToDelete.clicks || 0} clicks
                  </p>
                  {bannerToDelete.isPaidPromotion && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 mt-1">
                      Paid Promotion
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={!!actionLoadingId}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!actionLoadingId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {actionLoadingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {deleteMode === "permanent" ? "Deleting..." : "Moving..."}
                  </>
                ) : deleteMode === "permanent" ? (
                  "Delete Permanently"
                ) : (
                  "Move to Trash"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHeroBannersPage() {
  return (
    <AdminGuard>
      <AdminLayout>
        <HeroBannersContent />
      </AdminLayout>
    </AdminGuard>
  );
}
