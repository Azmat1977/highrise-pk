import React, { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import {
  Image as ImageIcon,
  UploadCloud,
  RefreshCw,
  Loader2,
  MapPin,
  BadgeCheck,
  Plus,
  Search,
  Trash2,
  X,
  Star,
  ShieldCheck,
} from "lucide-react";

type ActiveFilter = "all" | "true" | "false";
type FeaturedFilter = "all" | "true" | "false";

interface CityItem {
  _id: string;
  name: string;
  imageUrl: string;
  publicId?: string;
  displayOrder: number;
  isActive: boolean;
  isFeaturedOnHomepage: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface CitiesApiResponse {
  success: boolean;
  cities?: CityItem[];
  pagination?: { page: number; limit: number; total: number; pages: number };
  message?: string;
}


interface CreateCityForm {
  name: string;
  displayOrder: number;
  isActive: boolean;
  isFeaturedOnHomepage: boolean;
}

const defaultCreateForm: CreateCityForm = {
  name: "",
  displayOrder: 0,
  isActive: true,
  isFeaturedOnHomepage: false,
};


function AdminCitiesContent() {
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  const [cities, setCities] = useState<CityItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCityForm>(defaultCreateForm);
  const [creating, setCreating] = useState(false);

  const [pagination, setPagination] = useState<CitiesApiResponse["pagination"]>({
    page: 1,
    limit: 30,
    total: 0,
    pages: 1,
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<CityItem | null>(null);

  const featuredCount = useMemo(
    () => cities.filter((c) => c.isFeaturedOnHomepage).length,
    [cities]
  );
  const activeCount = useMemo(() => cities.filter((c) => c.isActive).length, [cities]);
  const withImagesCount = useMemo(() => cities.filter((c) => Boolean(c.imageUrl)).length, [cities]);

  const canFeatureMore = () => featuredCount < 4;

  const fetchCities = async (opts?: { nextPage?: number }) => {
    const nextPage = opts?.nextPage ?? page;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(limit));
      params.set("active", activeFilter);
      params.set("featured", featuredFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/cities?${params.toString()}`, { credentials: "include" });
      const data: CitiesApiResponse = await res.json();

      if (!data.success) {
        toast.error(data.message || "Failed to load cities");
        setCities([]);
        return;
      }

      setCities(data.cities || []);
      setPagination(data.pagination || { page: nextPage, limit, total: (data.cities || []).length, pages: 1 });
      setPage(data.pagination?.page || nextPage);
    } catch {
      toast.error("Failed to load cities");
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, featuredFilter]);

  const createCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("City name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: createForm.name.trim(),
          displayOrder: Number(createForm.displayOrder || 0),
          isActive: Boolean(createForm.isActive),
          isFeaturedOnHomepage: Boolean(createForm.isFeaturedOnHomepage),
          imageUrl: "",
          publicId: "",
        }),
      });

      const data = await res.json();
      if (!data?.success) {
        toast.error(data?.message || "Failed to create city");
        return;
      }

      toast.success("City added");
      setCreateForm(defaultCreateForm);
      setShowCreateForm(false);
      await fetchCities({ nextPage: 1 });
    } catch {
      toast.error("Failed to create city");
    } finally {
      setCreating(false);
    }
  };

  const patchCity = async (cityId: string, payload: Record<string, any>) => {
    const res = await fetch("/api/admin/cities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: cityId, ...payload }),
    });

    const data = await res.json();
    if (!data?.success) throw new Error(data?.message || "Update failed");

    const raw = data?.city as any;

    if (!raw) return undefined;

    // Normalize API response shape so UI updates instantly (API returns `image: { url }`)
    const normalized: CityItem = {
      _id: String(raw._id || cityId),
      name: String(raw.name || ""),
      imageUrl: raw?.imageUrl || raw?.image?.url || "",
      publicId: raw?.publicId || raw?.image?.publicId || "",
      displayOrder: typeof raw?.displayOrder === "number" ? raw.displayOrder : 0,
      isActive: typeof raw?.isActive === "boolean" ? raw.isActive : true,
      isFeaturedOnHomepage: Boolean(raw?.isFeaturedOnHomepage),
      createdAt: raw?.createdAt || null,
      updatedAt: raw?.updatedAt || null,
    };

    return normalized;
  };

  const applyCityFromResponse = (updated?: CityItem) => {
    if (!updated?._id) return;
    setCities((prev) =>
      prev.map((c) =>
        c._id === updated._id
          ? {
              ...c,
              ...updated,
              // Always keep imageUrl populated if backend sends nested `image.url`
              imageUrl: updated.imageUrl || c.imageUrl,
              publicId: updated.publicId || c.publicId,
            }
          : c
      )
    );
  };

  const toggleActive = async (city: CityItem) => {
    const next = !city.isActive;
    setCities((prev) => prev.map((c) => (c._id === city._id ? { ...c, isActive: next } : c)));

    setActionLoadingId(city._id);
    try {
      const updated = await patchCity(city._id, { isActive: next });
      applyCityFromResponse(updated);
      toast.success("Status updated");
    } catch (e: any) {
      setCities((prev) => prev.map((c) => (c._id === city._id ? { ...c, isActive: city.isActive } : c)));
      toast.error(e?.message || "Update failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleFeatured = async (city: CityItem) => {
    const next = !city.isFeaturedOnHomepage;

    if (next && !canFeatureMore()) {
      toast.error("Only 4 cities can be featured on homepage.");
      return;
    }

    setCities((prev) =>
      prev.map((c) => (c._id === city._id ? { ...c, isFeaturedOnHomepage: next } : c))
    );

    setActionLoadingId(city._id);
    try {
      const updated = await patchCity(city._id, { isFeaturedOnHomepage: next });
      applyCityFromResponse(updated);
      toast.success("Homepage featured updated");
    } catch (e: any) {
      setCities((prev) =>
        prev.map((c) =>
          c._id === city._id ? { ...c, isFeaturedOnHomepage: city.isFeaturedOnHomepage } : c
        )
      );
      toast.error(e?.message || "Update failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const updateOrder = async (city: CityItem) => {
    setActionLoadingId(city._id);
    try {
      const updated = await patchCity(city._id, { displayOrder: Number(city.displayOrder || 0) });
      applyCityFromResponse(updated);
      toast.success("Order updated");
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
      await fetchCities({ nextPage: page });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openUpload = (city: CityItem) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = false;

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error("City image must be 5MB or smaller");
        return;
      }

      setUploadingForId(city._id);
      try {
        const body = new FormData();
        body.append("file", file);

        const uploadResponse = await fetch("/api/upload?folder=cities", {
          method: "POST",
          credentials: "include",
          body,
        });
        const uploadData = await uploadResponse.json();

        if (
          !uploadResponse.ok ||
          !uploadData?.success ||
          !uploadData?.data?.url ||
          !uploadData?.data?.publicId
        ) {
          throw new Error(uploadData?.error || "Failed to upload city image");
        }

        setActionLoadingId(city._id);
        const updated = await patchCity(city._id, {
          imageUrl: uploadData.data.url,
          publicId: uploadData.data.publicId,
          clearImage: false,
        });
        applyCityFromResponse(updated);
        toast.success("City image updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload city image");
      } finally {
        setActionLoadingId(null);
        setUploadingForId(null);
      }
    };

    input.click();
  };

  const removeImage = async (city: CityItem) => {
    if (!city.imageUrl) return;

    setActionLoadingId(city._id);
    // optimistic
    setCities((prev) => prev.map((c) => (c._id === city._id ? { ...c, imageUrl: "" } : c)));

    try {
      const updated = await patchCity(city._id, { clearImage: true });
      applyCityFromResponse(updated);
      toast.success("City image removed");
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
      await fetchCities({ nextPage: page });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDeleteModal = (city: CityItem) => {
    setCityToDelete(city);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setCityToDelete(null);
    setDeleteModalOpen(false);
  };

  const confirmDeleteCity = async () => {
    if (!cityToDelete) return;

    const cityId = cityToDelete._id;
    closeDeleteModal();

    setActionLoadingId(cityId);
    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: cityId }),
      });

      const data = await res.json();
      if (!data?.success) {
        toast.error(data?.message || "Failed to delete city");
        return;
      }

      toast.success("City deleted");
      await fetchCities({ nextPage: 1 });
    } catch {
      toast.error("Failed to delete city");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCities({ nextPage: 1 });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-semibold mb-3">
            <MapPin className="w-4 h-4" />
            Homepage Locations
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Cities</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Add / remove cities, upload protected 9:16 images, and control which cities appear on the homepage.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm">
            <span className="font-semibold text-slate-900">{pagination?.total || 0}</span> total
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-900">{activeCount}</span> active
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-900">{withImagesCount}</span> with images
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-900">{featuredCount}</span> featured
          </div>

          <button
            type="button"
            onClick={() => fetchCities({ nextPage: page })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-medium hover:shadow-lg hover:shadow-[#029bba]/20 transition-all"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreateForm ? "Close" : "Add City"}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6 border border-slate-200 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Add a City</h2>
            <p className="text-sm text-slate-500 mt-1">
              Create city first. Upload image after it appears in “Manage Cities”.
            </p>
          </div>

          <form onSubmit={createCity} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City Name</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Gujranwala"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={createForm.displayOrder}
                  onChange={(e) => setCreateForm((p) => ({ ...p, displayOrder: Number(e.target.value || 0) }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-[#029bba]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Active</p>
                  <p className="text-xs text-slate-500">City is available in public lists</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isFeaturedOnHomepage}
                  onChange={(e) => setCreateForm((p) => ({ ...p, isFeaturedOnHomepage: e.target.checked }))}
                  className="w-4 h-4 accent-[#029bba]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Featured on Homepage</p>
                  <p className="text-xs text-slate-500">Shown in homepage Cities section</p>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-medium hover:shadow-lg hover:shadow-[#029bba]/20 transition-all disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create City
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateForm(defaultCreateForm);
                  setShowCreateForm(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 border border-slate-200 shadow-sm">
        <form onSubmit={onSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cities..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
          >
            <option value="all">All</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

          <div className="flex gap-3">
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
            >
              <option value="all">All</option>
              <option value="true">Featured</option>
              <option value="false">Not featured</option>
            </select>

            <button type="submit" className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              Search
            </button>
          </div>
        </form>
      </Card>

      {/* Cities List */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manage Cities</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload 9:16 images and mark up to <span className="font-semibold">4</span> cities as featured for homepage.
            </p>
          </div>

          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{pagination?.page || 1}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination?.pages || 1}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#029bba]" />
          </div>
        ) : cities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {cities.map((city) => {
              const busy = actionLoadingId === city._id || uploadingForId === city._id;

              return (
                <div key={city._id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-5">
                    <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      {city.imageUrl ? (
                        <img src={city.imageUrl} alt={city.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                          <ImageIcon className="w-7 h-7" />
                          <p className="text-[11px]">No image</p>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#004063]/10 text-[#004063]">
                              Order #{city.displayOrder ?? 0}
                            </span>

                            {city.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                                Inactive
                              </span>
                            )}

                            {city.isFeaturedOnHomepage && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                <Star className="w-3.5 h-3.5" />
                                Featured
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#029bba]/10 text-[#029bba]">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              9:16
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 truncate">{city.name}</h3>

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Display order</span>
                              <input
                                type="number"
                                min={0}
                                value={city.displayOrder ?? 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value || 0);
                                  setCities((prev) =>
                                    prev.map((c) => (c._id === city._id ? { ...c, displayOrder: val } : c))
                                  );
                                }}
                                onBlur={() => updateOrder(city)}
                                className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                                disabled={busy}
                              />
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                              <input
                                type="checkbox"
                                checked={city.isActive}
                                onChange={() => toggleActive(city)}
                                className="w-4 h-4 accent-[#029bba]"
                                disabled={busy}
                              />
                              Active
                            </label>

                            <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                              <input
                                type="checkbox"
                                checked={city.isFeaturedOnHomepage}
                                onChange={() => toggleFeatured(city)}
                                className="w-4 h-4 accent-[#029bba]"
                                disabled={busy}
                              />
                              Featured
                            </label>
                          </div>

                          {city.updatedAt && (
                            <p className="text-xs text-slate-500 mt-3">
                              Updated: {new Date(city.updatedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap xl:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openUpload(city)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#029bba] to-[#027a94] text-white font-medium hover:shadow-lg hover:shadow-[#029bba]/20 transition-all disabled:opacity-60"
                          >
                            {uploadingForId === city._id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-4 h-4" />
                                {city.imageUrl ? "Replace Image" : "Upload Image"}
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImage(city)}
                            disabled={busy || !city.imageUrl}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                          >
                            <X className="w-4 h-4" />
                            Remove Image
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(city)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete City
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-4 bg-white flex items-center justify-between">
              <button
                type="button"
                onClick={() => fetchCities({ nextPage: Math.max(1, page - 1) })}
                disabled={page <= 1 || loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Previous
              </button>

              <div className="text-sm text-slate-600">
                Showing page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">{pagination?.pages || 1}</span>
              </div>

              <button
                type="button"
                onClick={() => fetchCities({ nextPage: Math.min(pagination?.pages || 1, page + 1) })}
                disabled={page >= (pagination?.pages || 1) || loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No Cities Found</h3>
            <p className="text-sm text-slate-500 mt-1">Add a city to start managing homepage locations.</p>
          </div>
        )}
      </Card>

      {deleteModalOpen && cityToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDeleteModal} />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center">
                Delete city “{cityToDelete.name}”?
              </h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                This action cannot be undone. The city entry will be permanently removed.
              </p>
            </div>

            <div className="p-6 pt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCity}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Delete City
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCitiesPage() {
  return (
    <AdminGuard>
      <AdminLayout>
        <AdminCitiesContent />
      </AdminLayout>
    </AdminGuard>
  );
}
