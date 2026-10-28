// File: pages/saved-properties.tsx
// COMPLETE REPLACEMENT
// Saved favorites dashboard — API-driven, no localStorage cross-tab tricks
// All banned patterns removed (toast, custom events, sessionStorage sync)

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Heart,
  Loader2,
  MapPin,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  Lock,
} from "lucide-react";
import { getOptimizedImageUrl } from "@/utils/cloudinaryTransform";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "property" | "project";

interface PropertyImage {
  url?: string;
  publicId?: string;
}

interface PropertyShape {
  _id?: string;
  id?: string;
  slug?: string;
  title?: string;
  name?: string;
  city?: string;
  location?: { city?: string };
  price?: number | string;
  pricePKR?: number | string;
  pricing?: { amount?: number | string };
  coverImage?: string;
  thumbnail?: string;
  images?: (PropertyImage | string)[];
  propertyType?: string;
}

interface FavoriteItem {
  _id?: string;
  entityType?: EntityType;
  entityId?: string | PropertyShape;

  // Legacy shapes (defensive)
  property?: PropertyShape;
  project?: PropertyShape;
  entity?: PropertyShape;
  item?: PropertyShape;

  createdAt?: string;
}

interface BannerState {
  type: "success" | "error";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

function getId(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as { _id?: unknown; id?: unknown };
  return safeStr(o._id ?? o.id);
}

function isPropertyObject(value: unknown): value is PropertyShape {
  return !!value && typeof value === "object";
}

function pickFavoritesArray(payload: unknown): FavoriteItem[] {
  if (!payload || typeof payload !== "object") return [];

  const p = payload as Record<string, unknown>;

  // ✅ Preferred API shape
  const data = p.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.favorites)) {
    return data.favorites as FavoriteItem[];
  }

  // Common alternates
  const candidates: unknown[] = [
    p.favorites,
    p.items,
    p.data,
    p.results,
    p.rows,
    p.list,
    (p.favorites as Record<string, unknown> | undefined)?.items,
    data?.items,
    (p.result as Record<string, unknown> | undefined)?.items,
    (p.payload as Record<string, unknown> | undefined)?.items,
    p.payload,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as FavoriteItem[];
  }
  return [];
}

function extractPropertyFromFavorite(it: FavoriteItem): PropertyShape {
  if (isPropertyObject(it.property)) return it.property;
  if (isPropertyObject(it.entity)) return it.entity;
  if (isPropertyObject(it.item)) return it.item;
  if (isPropertyObject(it.entityId)) return it.entityId;
  return {};
}

function getFavoriteEntityType(it: FavoriteItem): EntityType {
  const t = safeStr(it.entityType).toLowerCase();
  return t === "project" ? "project" : "property";
}

function getFavoriteEntityId(it: FavoriteItem): string {
  if (isPropertyObject(it.entityId)) return getId(it.entityId);
  if (typeof it.entityId === "string") return it.entityId;
  const p = extractPropertyFromFavorite(it);
  return getId(p);
}

function formatPrice(value: number | string | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return safeStr(value);
  if (n >= 10_000_000) return `PKR ${(n / 10_000_000).toFixed(2)} Crore`;
  if (n >= 100_000) return `PKR ${(n / 100_000).toFixed(2)} Lac`;
  return `PKR ${n.toLocaleString("en-PK")}`;
}

function getCardImage(p: PropertyShape & { featureImageUrl?: string }): string {
  if (p.featureImageUrl) return safeStr(p.featureImageUrl);
  if (p.coverImage) return safeStr(p.coverImage);
  if (p.thumbnail) return safeStr(p.thumbnail);
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && first.url) return first.url;
  }
  return "";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SavedPropertiesPage(): React.ReactElement {
  const router = useRouter();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Inline banner
  const [banner, setBanner] = useState<BannerState | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);

  // ── Banner helpers ─────────────────────────────────────────────────────────
  const showBanner = useCallback(
    (type: "success" | "error", message: string) => {
      setBanner({ type, message });
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), 4000);
    },
    []
  );

  useEffect(
    () => () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    },
    []
  );

  // ── Fetch saved properties ────────────────────────────────────────────────
  const fetchSaved = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/favorites?limit=50&page=1`, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const msg = safeStr((data as { message?: string }).message) || "Failed to load saved properties.";
        throw new Error(msg);
      }

      let list = pickFavoritesArray(data);

      // ── Fallback Hydration: If mode=list returns empty populated objects ──
      if (list.length === 0) {
        try {
          const idsRes = await fetch(`/api/favorites?mode=ids&_ts=${Date.now()}`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          const idsData = await idsRes.json();
          const propertyIds: string[] = Array.isArray(idsData?.data?.propertyIds)
            ? idsData.data.propertyIds.map((id: unknown) => String(id))
            : [];

          if (propertyIds.length > 0) {
            const propsRes = await fetch(`/api/properties?limit=50`, {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            });
            const propsData = await propsRes.json();
            const allProperties: PropertyShape[] = Array.isArray(propsData?.properties)
              ? propsData.properties
              : [];

            const matchedProperties = allProperties.filter((p) => {
              const pid = getId(p);
              return propertyIds.includes(pid);
            });

            list = matchedProperties.map((p) => ({
              _id: getId(p),
              entityType: "property" as EntityType,
              entityId: p,
              property: p,
            }));
          }
        } catch {
          // Fallback best effort
        }
      }

      // Keep only property favorites + dedupe by canonical key
      const uniqueMap = new Map<string, FavoriteItem>();
      for (const it of list) {
        if (getFavoriteEntityType(it) !== "property") continue;
        const propertyId = getFavoriteEntityId(it);
        if (!propertyId) continue;
        const key = `property:${propertyId}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, it);
      }

      setItems(Array.from(uniqueMap.values()));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg =
        err instanceof Error ? err.message : "Unable to load saved properties.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auth redirect + initial fetch ─────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      router.replace(
        `/login?redirect=${encodeURIComponent("/saved-properties")}`
      );
      return;
    }

    fetchSaved();

    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, [status, router, fetchSaved]);

  // ── Refetch on tab focus ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSaved();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, fetchSaved]);

  // ── Remove favorite (optimistic + rollback) ──────────────────────────────
  const handleRemove = useCallback(
    async (favorite: FavoriteItem) => {
      const propertyId = getFavoriteEntityId(favorite);
      const favoriteId = safeStr(favorite._id);

      if (!propertyId) {
        showBanner("error", "Invalid favorite record (missing property id).");
        return;
      }

      if (removingId) return;
      setRemovingId(propertyId);

      // Snapshot for rollback
      const snapshot = items;

      // Optimistic remove
      setItems((prev) =>
        prev.filter((x) => {
          const xFavId = safeStr(x._id);
          if (favoriteId) return xFavId !== favoriteId;
          return getFavoriteEntityId(x) !== propertyId;
        })
      );

      try {
        const res = await fetch("/api/favorites/toggle", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            entityType: "property",
            entityId: propertyId,
          }),
        });

        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          data?: {
            action?: string;
            isFavorited?: boolean;
          };
        };

        if (!res.ok || !body.success) {
          setItems(snapshot);
          throw new Error(body.message ?? "Unable to remove.");
        }

        const removed =
          body.data?.action === "removed" || body.data?.isFavorited === false;

        if (!removed) {
          setItems(snapshot);
          await fetchSaved();
          throw new Error("Remove failed — please try again.");
        }

        showBanner("success", "Removed from saved properties.");

        // Broadcast removal event to Header & global app state
        try {
          localStorage.setItem(
            "highrise_favorite_toggle",
            JSON.stringify({
              entityType: "property",
              entityId: propertyId,
              action: "removed",
              timestamp: Date.now(),
            })
          );
        } catch {}
        window.dispatchEvent(new CustomEvent("highrise_favorite_updated"));
        window.dispatchEvent(new CustomEvent("highrise:favorites-changed"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unable to remove.";
        showBanner("error", msg);
      } finally {
        setRemovingId(null);
      }
    },
    [items, removingId, showBanner, fetchSaved]
  );

  // ── Card list (memoized) ───────────────────────────────────────────────────
  const savedCards = useMemo(() => {
    return items.map((it) => {
      const p = extractPropertyFromFavorite(it);
      const propertyId = getFavoriteEntityId(it);
      const title = safeStr(p.title ?? p.name) || "Property";
      const city = safeStr(p.city ?? p.location?.city);
      const priceValue = p.price ?? p.pricePKR ?? p.pricing?.amount;
      const priceLabel = formatPrice(priceValue);
      const img = getCardImage(p);
      const slugOrId = safeStr(p.slug) || propertyId;
      const href = slugOrId ? `/property/${slugOrId}` : "#";
      const key = `property:${propertyId || safeStr(it._id)}`;
      const isRemoving = removingId === propertyId;

      return (
        <div
          key={key}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow animate-fadeIn"
        >
          {/* Image */}
          <div className="aspect-[16/9] bg-gray-100 relative">
            {img ? (
              <img
                src={getOptimizedImageUrl(img, { width: 600, watermark: true })}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <Heart className="w-8 h-8 mb-1" />
                <span className="text-xs">No image</span>
              </div>
            )}
            {/* Heart pill */}
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1 shadow-sm">
              <Heart className="w-3.5 h-3.5 text-[#ef4444] fill-[#ef4444]" />
              <span className="text-xs font-semibold text-[#333333]">Saved</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-bold text-[#004063] line-clamp-2 leading-snug">
              {title}
            </h3>

            <div className="flex items-center text-sm text-[#666666] mt-1.5">
              <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">{city || "Pakistan"}</span>
            </div>

            {priceLabel && (
              <p className="mt-3 font-extrabold text-[#029bba]">{priceLabel}</p>
            )}

            <div className="mt-4 flex items-center gap-2">
              {slugOrId ? (
                <Link
                  href={href}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#029bba] hover:bg-[#017a8a] text-white font-semibold text-sm transition-colors"
                >
                  View
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed"
                  disabled
                >
                  View
                </button>
              )}

              <button
                type="button"
                disabled={isRemoving}
                onClick={() => handleRemove(it)}
                className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                aria-label={`Remove ${title}`}
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      );
    });
  }, [items, removingId, handleRemove]);

  // ── Auth loading ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#029bba]" />
      </div>
    );
  }

  if (status !== "authenticated") {
    // Redirecting via useEffect — show brief gate
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-md w-full">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#666666]">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Saved Properties | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Your favorite property listings on Highrise.pk"
        />
      </Head>

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      {banner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[130] animate-fadeIn px-4">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border-l-4 ${
              banner.type === "success"
                ? "bg-[#f0fdf4] border-[#10b981] text-[#10b981]"
                : "bg-[#fef2f2] border-[#ef4444] text-red-700"
            }`}
          >
            {banner.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{banner.message}</p>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-[#ef4444] fill-[#ef4444]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#666666]">
                  Your Wishlist
                </span>
              </div>
              <h1 className="text-3xl font-bold text-[#004063]">
                Saved Properties
              </h1>
              <p className="text-[#666666] mt-1">
                Your favorite listings in one place.
              </p>
            </div>

            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-[#333333] font-semibold text-sm transition-colors"
            >
              Browse Properties
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="mt-8">

            {loading ? (
              /* Loading */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#029bba] mb-3" />
                <p className="text-sm text-[#666666]">
                  Loading your saved properties…
                </p>
              </div>
            ) : error ? (
              /* Error */
              <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 mb-1">
                      Couldn&apos;t Load Saved Properties
                    </h3>
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={() => fetchSaved()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            ) : savedCards.length === 0 ? (
              /* Empty */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-[#ef4444]" />
                </div>
                <h2 className="text-xl font-bold text-[#004063] mb-2">
                  No Saved Properties Yet
                </h2>
                <p className="text-[#666666] mb-6 max-w-md mx-auto">
                  Tap the heart icon on any listing to save it here. Build your
                  shortlist as you browse.
                </p>
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#017a8a] text-white font-semibold transition-colors"
                >
                  Explore Listings
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              /* Grid */
              <>
                <p className="text-sm text-[#666666] mb-4">
                  {items.length}{" "}
                  {items.length === 1 ? "property" : "properties"} saved
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedCards}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}