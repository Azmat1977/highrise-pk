// components/property/property-card.tsx

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import {
  Heart,
  MapPin,
  Building,
  BedDouble,
  Bath,
  Car,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Camera,
  Video,
  CheckCircle,
  Flame,
  Star,
  Clock,
  Phone,
  MessageCircle,
  Eye,
  X,
  LogIn,
  UserPlus,
  Lock,
  TrendingDown,
  Shield,
  BarChart3,
  Check,
} from 'lucide-react';

import { useCompare } from '@/hooks/useCompare';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';

// ============================================
// Types (Enterprise: tolerate IdLike drift)
// ============================================

type IdLike = string | number | { toString?: () => string } | null | undefined;

type ListingType = 'full_payment' | 'installment' | 'rent' | 'sale';

type ImageLike = string | { url?: string | null } | null | undefined;

export interface PropertyCardInput {
  _id?: IdLike;
  id?: IdLike;
  slug?: string;

  title?: string;
  name?: string;

  price?: number;

  area?: number;
  areaSize?: number;
  size?: number;

  unit?: string;
  areaUnit?: string;

  bedrooms?: number;
  beds?: number;

  bathrooms?: number;
  baths?: number;

  parking?: boolean | number;

  developer?: string;

  city?: string;
  location?: string;

  type?: string;
  propertyType?: string;
  category?: string;

  images?: ImageLike[]; // supports string[] or {url}[]
  image?: string;
  imageUrl?: string;
  photos?: string[];

  status?: string;
  purpose?: string;
  listingType?: ListingType;

  createdAt?: string;

  project?: {
    _id?: IdLike;
    slug?: string;
    name?: string;
  };

  videoUrl?: string;
  video?: string;

  isVerified?: boolean;
  verified?: boolean;

  isFeatured?: boolean;
  featured?: boolean;

  isHot?: boolean;
  hot?: boolean;

  projectId?: string;

  contact?: {
    phone?: string;
    whatsapp?: string;
    showPhoneOnListing?: boolean; // optional future-compatible
    allowWhatsappMessages?: boolean; // optional future-compatible
  };

  phone?: string;
  whatsapp?: string;
  contactNumber?: string;

  views?: number;

  previousPrice?: number;
  priceDropPercent?: number;
  priceHistory?: {
    oldPrice?: number;
    changeAmount?: number;
    changePercent?: number;
    changeType?: 'increase' | 'decrease';
    changedAt?: string;
  };
}

interface PropertyCardProps {
  property: PropertyCardInput;
  linkType?: 'property' | 'project';
  showQuickContact?: boolean;
}

// ============================================
// Design System
// ============================================

const PRIMARY_COLOR = '#029bba';

// ============================================
// Helpers (Enterprise-grade normalization)
// ============================================

function toIdString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);

  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;

    for (const key of ['$oid', '_id', 'id']) {
      const nested = obj[key];
      if (nested != null && nested !== v) {
        const resolved = toIdString(nested);
        if (resolved) return resolved;
      }
    }

    const toHexString = (v as { toHexString?: () => unknown }).toHexString;
    if (typeof toHexString === 'function') {
      try {
        const resolved = toHexString.call(v);
        if (typeof resolved === 'string' && resolved.trim()) {
          return resolved.trim();
        }
      } catch {}
    }

    const toStringFn = (v as { toString?: () => unknown }).toString;
    if (typeof toStringFn === 'function') {
      try {
        const resolved = toStringFn.call(v);
        if (
          typeof resolved === 'string' &&
          resolved.trim() &&
          resolved.trim() !== '[object Object]'
        ) {
          return resolved.trim();
        }
      } catch {}
    }
  }

  return '';
}

const formatPrice = (price?: number): string => {
  if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) return 'Price on Request';
  if (price >= 10000000) return `PKR ${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `PKR ${(price / 100000).toFixed(2)} Lac`;
  return `PKR ${price.toLocaleString('en-PK')}`;
};

const formatArea = (area?: number, unit?: string): string => {
  if (typeof area !== 'number' || Number.isNaN(area) || area <= 0) return '';
  const formattedUnit = unit || 'Sq.Ft.';
  return `${area.toLocaleString('en-PK')} ${formattedUnit}`;
};

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (!Number.isFinite(diffInSeconds)) return '';

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;

  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

const generatePropertyUrl = (property: PropertyCardInput, linkType: 'property' | 'project' = 'property'): string => {
  if (linkType === 'project') {
    if (property.slug) return `/projects/${property.slug}`;
    if (property.project?.slug) return `/projects/${property.project.slug}`;
    const pid = toIdString(property.project?._id) || toIdString(property._id) || toIdString(property.id);
    return pid ? `/projects/${pid}` : '#';
  }

  if (property.slug) return `/property/${property.slug}`;
  const id = toIdString(property._id) || toIdString(property.id);
  return id ? `/property/${id}` : '#';
};

function normalizePkDigits(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // If already starts with 92
  if (digits.startsWith('92') && digits.length >= 12) return digits;
  // If starts with 0 (03xx...) -> 92 + remove 0
  if (digits.startsWith('0') && digits.length >= 11) return `92${digits.slice(1)}`;
  // If starts with 3 and length 10 (3xxxxxxxxx) -> 92 + digits
  if (digits.startsWith('3') && digits.length === 10) return `92${digits}`;
  // fallback
  return digits;
}

function safeOpen(url: string) {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
}

// Enterprise: avoid unsafe image URLs (defense-in-depth)
// - allow only http/https
// - cap length to prevent abuse
function safeImageUrl(input?: string | null): string {
  const u = (input || '').trim();
  if (!u) return '';
  if (u.length > 2048) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return '';
}

// ============================================
// Login Modal Component
// ============================================

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyImage: string | null;
  propertyTitle: string;
  propertyCity: string;
  propertyPrice: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, propertyImage, propertyTitle, propertyCity, propertyPrice }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof window === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Favorites</h3>
          <p className="text-sm text-gray-500">Login to save properties and access them anytime from any device</p>
        </div>

        <div className="mx-6 p-3 bg-gray-50 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            {propertyImage ? (
              <img src={propertyImage} alt={propertyTitle} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                <ImageOff className="w-6 h-6 text-gray-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{propertyTitle}</p>
              <p className="text-xs text-gray-500 truncate">{propertyCity}</p>
              <p className="text-sm font-bold text-[#029bba]">{propertyPrice}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <a
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white rounded-xl font-semibold hover:from-[#017a8a] hover:to-[#015a6a] transition-all shadow-lg shadow-[#029bba]/25"
          >
            <LogIn className="w-5 h-5" />
            Login to Save
          </a>

          <a
            href="/login?mode=signup"
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:border-[#029bba] hover:text-[#029bba] transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Create Account
          </a>

          <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Maybe later
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>Your data is secure with us</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// ============================================
// Property Card Component
// ============================================

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, linkType = 'property', showQuickContact = true }) => {
  // Normalize id once (enterprise: use everywhere)
  const propertyId = useMemo(() => toIdString(property._id) || toIdString(property.id), [property._id, property.id]);

  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Unified Compare Hook
  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'property' });

  const isCompared = propertyId ? isInCompare(propertyId, 'property') : false;
  const comparePending = compareState === 'pending';

  // TOAST STATE Lightweight notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => setMounted(true), []);

  // ═══════════════════════════════════════════
  // ❤️ LOAD FAVORITE STATE + SYNC LISTENER
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (!mounted || !propertyId) return;

    const fetchFavoriteStatus = async () => {
      try {
        const session = await getSession();
        if (!session?.user) return;

        const res = await fetch(`/api/favorites?mode=list&entityType=property&limit=500&_ts=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data?.favorites)) {
          const isFav = data.data.favorites.some((fav: any) => {
            const entityId = typeof fav?.entityId === 'object' ? fav?.entityId?._id : fav?.entityId;
            return String(entityId) === String(propertyId);
          });
          setIsFavorite(isFav);
        }
      } catch {
        // ignore
      }
    };

    fetchFavoriteStatus();

    // 🔄 Listen for sync events from other pages
    const handleFavoriteSync = () => {
      fetchFavoriteStatus();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'highrise_favorite_toggle') {
        fetchFavoriteStatus();
      }
    };

    window.addEventListener('highrise_favorite_updated', handleFavoriteSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('highrise_favorite_updated', handleFavoriteSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [mounted, propertyId]);

  // (Compare initialized reactively via useCompare hook)

  // Enterprise: safer JSON parsing (function declaration = hoisted, avoids TS "used before declaration")
  async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  const getUser = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  const title = property.title || property.name || 'Untitled Property';
  const price = typeof property.price === 'number' ? property.price : 0;
  const city = property.city || property.location || 'Unknown Location';
  const propertyType = property.type || property.propertyType || property.category || 'Property';
  const area =
    (typeof property.area === 'number' ? property.area : undefined) ??
    (typeof property.areaSize === 'number' ? property.areaSize : undefined) ??
    (typeof property.size === 'number' ? property.size : undefined) ??
    0;

  const areaUnit = property.unit || property.areaUnit || 'Sq.Ft.';
  const bedrooms = (typeof property.bedrooms === 'number' ? property.bedrooms : undefined) ?? (typeof property.beds === 'number' ? property.beds : undefined) ?? 0;
  const bathrooms = (typeof property.bathrooms === 'number' ? property.bathrooms : undefined) ?? (typeof property.baths === 'number' ? property.baths : undefined) ?? 0;

  const hasParking = property.parking === true || (typeof property.parking === 'number' && property.parking > 0);
  const developer = property.developer || '';
  const status = property.status || '';
  const purpose = (property.purpose || property.listingType || 'sale').toString();

  const allImages = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();

    const push = (u?: string | null) => {
      const url = safeImageUrl(u);
      if (!url) return;
      if (seen.has(url)) return;
      seen.add(url);
      out.push(url);
    };

    if (Array.isArray(property.images)) {
      for (const img of property.images) {
        if (typeof img === 'string') push(img);
        else if (img && typeof img === 'object') push(typeof img.url === 'string' ? img.url : null);
      }
    }

    if (Array.isArray(property.photos)) {
      for (const p of property.photos) push(typeof p === 'string' ? p : null);
    }

    push(typeof property.image === 'string' ? property.image : null);
    push(typeof property.imageUrl === 'string' ? property.imageUrl : null);

    return out;
  }, [property.images, property.photos, property.image, property.imageUrl]);

  const imageCount = allImages.length;
  const hasMultipleImages = imageCount > 1;

  // keep index valid if images list changes
  useEffect(() => {
    if (currentImageIndex >= imageCount) setCurrentImageIndex(0);
  }, [imageCount, currentImageIndex]);

  const currentImage = allImages[currentImageIndex] || null;

  const rawPhone = property.contact?.phone || property.phone || property.contactNumber || '';
  const rawWhatsapp = property.contact?.whatsapp || property.whatsapp || rawPhone || '';

  const phoneNumber = normalizePkDigits(rawPhone);
  const whatsappNumber = normalizePkDigits(rawWhatsapp);

  // Enterprise privacy gates (future-compatible)
  const canShowPhone = !!phoneNumber && property.contact?.showPhoneOnListing !== false;
  const canWhatsapp = !!whatsappNumber && property.contact?.allowWhatsappMessages !== false;

  const isVerified = !!(property.isVerified || property.verified || property.projectId);
  const isFeaturedProp = !!(property.isFeatured || property.featured);
  const isHot = !!(property.isHot || property.hot);
  const hasVideo = !!(property.videoUrl || property.video);
  const timeAgo = formatTimeAgo(property.createdAt);

  // Price drop detection
  const priceChange = useMemo(() => {
    if (
      property.priceHistory?.changeType === 'decrease' &&
      typeof property.priceHistory.oldPrice === 'number' &&
      property.priceHistory.oldPrice > 0 &&
      price > 0 &&
      price < property.priceHistory.oldPrice
    ) {
      const oldPrice = property.priceHistory.oldPrice;
      const changeAmount =
        typeof property.priceHistory.changeAmount === 'number' ? property.priceHistory.changeAmount : oldPrice - price;
      const changePercent =
        typeof property.priceHistory.changePercent === 'number'
          ? property.priceHistory.changePercent
          : Math.round((changeAmount / oldPrice) * 100);

      return { hasChange: true, type: 'decrease' as const, oldPrice, changeAmount, changePercent, changedAt: property.priceHistory.changedAt };
    }

    if (typeof property.previousPrice === 'number' && property.previousPrice > 0 && price > 0 && price < property.previousPrice) {
      const oldPrice = property.previousPrice;
      const changeAmount = oldPrice - price;
      const changePercent = typeof property.priceDropPercent === 'number' ? property.priceDropPercent : Math.round((changeAmount / oldPrice) * 100);

      return { hasChange: true, type: 'decrease' as const, oldPrice, changeAmount, changePercent, changedAt: undefined as string | undefined };
    }

    return { hasChange: false, type: null as null, oldPrice: 0, changeAmount: 0, changePercent: 0, changedAt: undefined as string | undefined };
  }, [property.priceHistory, property.previousPrice, property.priceDropPercent, price]);

  const hasPriceDrop = priceChange.hasChange && priceChange.type === 'decrease';

  const getStatusColor = (s: string): string => {
    const colors: Record<string, string> = {
      'Trusted Developer': 'bg-green-100 text-green-800',
      'New Listing': 'bg-blue-100 text-blue-800',
      'New Joint Venture': 'bg-purple-100 text-purple-800',
      Featured: 'bg-amber-100 text-amber-800',
      Verified: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      sold: 'bg-red-100 text-red-800',
      rented: 'bg-orange-100 text-orange-800',
    };
    return colors[s] || 'bg-gray-100 text-gray-800';
  };

  const purposeInfo = useMemo(() => {
    const p = purpose.toLowerCase();
    if (p === 'rent') return { label: 'For Rent', color: 'bg-orange-500' };
    if (p === 'installment' || p === 'installments') return { label: 'Installments', color: 'bg-purple-500' };
    return { label: 'For Sale', color: 'bg-[#029bba]' };
  }, [purpose]);

  const getPriceDisplay = useCallback((): string => {
    const formatted = formatPrice(price);
    if (purpose.toLowerCase() === 'rent') return `${formatted}/mo`;
    return formatted;
  }, [price, purpose]);

  const href = useMemo(() => generatePropertyUrl(property, linkType), [property, linkType]);

  // ==========================================
  // Event Handlers
  // ==========================================

  // ═══════════════════════════════════════════
  // ❤️ HEART CLICK — Check NextAuth Session
  // ═══════════════════════════════════════════
  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (favoriteLoading) return;

    // Check NextAuth session properly
    const session = await getSession();
    
    if (!session?.user) {
      // Show login modal only when truly not logged in
      setShowLoginModal(true);
      return;
    }

    // User is logged in — toggle with optimistic UI
    handleToggleFavorite();
  };

  // ═══════════════════════════════════════════
  // ❤️ TOGGLE FAVORITE — Optimistic UI + Sync
  // ═══════════════════════════════════════════
  const handleToggleFavorite = async () => {
    if (!propertyId || favoriteLoading) return;

    const previousState = isFavorite;
    const entityType = 'property';

    // ═══════════════════════════════════════════
    // STEP 1: Optimistic UI — Update immediately
    // ═══════════════════════════════════════════
    setIsFavorite(!previousState);
    setFavoriteLoading(true);

    try {
      // ═══════════════════════════════════════════
      // STEP 2: Background sync with server
      // ═══════════════════════════════════════════
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId: propertyId,
        }),
      });

      const data = await response.json();

      // ═══════════════════════════════════════════
      // STEP 3: Handle server response gracefully
      // ═══════════════════════════════════════════
      if (!response.ok || !data.success) {
        // Revert optimistic update on failure
        setIsFavorite(previousState);
        showToast(data?.message || 'Unable to update favorites', 'error');
        return;
      }

      // ═══════════════════════════════════════════
      // STEP 4: Confirm server state
      // ═══════════════════════════════════════════
      setIsFavorite(Boolean(data?.data?.isFavorited));

      // Show success toast
      showToast(
        data?.data?.isFavorited ? 'Saved to your list' : 'Removed from saved',
        'success'
      );

      // ═══════════════════════════════════════════
      // STEP 5: Notify other pages (sync)
      // ═══════════════════════════════════════════
      try {
        localStorage.setItem(
          'highrise_favorite_toggle',
          JSON.stringify({
            entityType,
            entityId: propertyId,
            action: data?.data?.action,
            timestamp: Date.now(),
          })
        );
      } catch {}
      window.dispatchEvent(new CustomEvent('highrise_favorite_updated'));

    } catch (error) {
      // ═══════════════════════════════════════════
      // STEP 6: Network error — Revert and notify
      // ═══════════════════════════════════════════
      setIsFavorite(previousState);
      showToast('Connection error. Please try again.', 'error');
      console.error('Favorite toggle error:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleToggleCompare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!propertyId) return;

    const success = await toggleCompare(propertyId, 'property');
    if (!success && !isCompared && isMaxReached) {
      showToast('Maximum 4 items can be compared at once', 'error');
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageCount) return;
    setCurrentImageIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageCount) return;
    setCurrentImageIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1));
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phoneNumber) return;
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!whatsappNumber) return;
    const msg = encodeURIComponent(`Hi, I'm interested in: ${title}`);
    safeOpen(`https://wa.me/${whatsappNumber}?text=${msg}`);
  };

  const handleCloseModal = useCallback(() => setShowLoginModal(false), []);

  // ==========================================
  // Render
  // ==========================================

  return (
    <>
      <div className="relative">
        <Link href={href}>
          <div
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Image Section */}
            <div className="relative h-52 overflow-hidden bg-gray-100">
              {currentImage && !imageError ? (
                <img
                  src={getOptimizedImageUrl(currentImage, { width: 900, watermark: true })}
                  alt={title}
                  className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <ImageOff className="w-12 h-12 text-gray-300 mb-2" />
                  <span className="text-sm text-gray-400">No Image Available</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {hasMultipleImages && isHovered && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110"
                    aria-label="Previous image"
                    type="button"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow-lg transition-all duration-200 hover:scale-110"
                    aria-label="Next image"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {hasMultipleImages && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.slice(0, 5).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50 hover:bg-white/80'}`}
                      aria-label={`Show image ${idx + 1}`}
                      type="button"
                    />
                  ))}
                  {imageCount > 5 && <span className="text-white/70 text-[10px] ml-1">+{imageCount - 5}</span>}
                </div>
              )}

              {/* Top Left Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <span className={`${purposeInfo.color} text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg`}>
                  {purposeInfo.label}
                </span>

                {isHot && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                    <Flame className="w-3 h-3" />
                    HOT
                  </span>
                )}

                {isFeaturedProp && !isHot && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </span>
                )}

                {hasPriceDrop && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg">
                    <TrendingDown className="w-3 h-3" />
                    {priceChange.changePercent}% OFF
                  </span>
                )}
              </div>

              {/* Bottom Left Badges */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-lg shadow-lg">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                )}

                {status && !isVerified && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm ${getStatusColor(status)}`}>{status}</span>
                )}
              </div>

              {/* Bottom Right - Photo & Video Count */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {imageCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                    <Camera className="w-3 h-3" />
                    {imageCount}
                  </span>
                )}
                {hasVideo && (
                  <span className="inline-flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                    <Video className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 text-lg line-clamp-1 mb-2 group-hover:text-[#029bba] transition-colors">
                {title}
              </h3>

              <div className="flex items-center text-sm text-gray-500 mb-3">
                <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                <span className="line-clamp-1">{city}</span>
              </div>

              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="w-4 h-4 mr-1.5 text-gray-400" />
                  <span className="font-medium">{propertyType}</span>
                </div>

                {area > 0 && <div className="text-sm text-gray-600 font-medium">{formatArea(area, areaUnit)}</div>}
              </div>

              <div className="flex items-center gap-4 mb-4">
                {bedrooms > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BedDouble className="w-4 h-4 mr-1.5 text-gray-400" />
                    <span>
                      {bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}
                    </span>
                  </div>
                )}

                {bathrooms > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Bath className="w-4 h-4 mr-1.5 text-gray-400" />
                    <span>
                      {bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}
                    </span>
                  </div>
                )}

                {hasParking && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Car className="w-4 h-4 mr-1.5 text-gray-400" />
                    <span>Parking</span>
                  </div>
                )}
              </div>

              {/* Price & Developer Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  {hasPriceDrop && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400 line-through">{formatPrice(priceChange.oldPrice)}</span>
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        -{priceChange.changePercent}%
                      </span>
                    </div>
                  )}

                  <span className="text-xl font-bold" style={{ color: hasPriceDrop ? '#059669' : PRIMARY_COLOR }}>
                    {getPriceDisplay()}
                  </span>
                </div>

                {developer && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg truncate max-w-[100px]" title={developer}>
                    {developer}
                  </span>
                )}
              </div>

              {/* Quick Contact Buttons */}
              {showQuickContact && (canShowPhone || canWhatsapp) && (
                <div className="flex gap-2 mb-3">
                  {canShowPhone && (
                    <button
                      onClick={handleCall}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#029bba] hover:bg-[#017a8a] text-white text-sm font-medium rounded-lg transition-colors"
                      type="button"
                      aria-label="Call"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                  )}

                  {canWhatsapp && (
                    <button
                      onClick={handleWhatsApp}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                      type="button"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  )}
                </div>
              )}

              {/* Compare Toggle */}
              {propertyId && (
                <button
                  onClick={handleToggleCompare}
                  disabled={comparePending || (!isCompared && isMaxReached)}
                  className={`w-full mb-2 text-xs font-bold rounded-xl border px-3 py-2 flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    isCompared
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40 hover:text-[#029bba] hover:bg-[#029bba]/5'
                  }`}
                  type="button"
                  aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
                >
                  {isCompared ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <BarChart3 className="w-3.5 h-3.5 text-[#029bba]" />
                  )}
                  {isCompared ? 'Added to Compare' : 'Add to Compare'}
                </button>
              )}

              {/* Time Listed & View Count */}
              {(timeAgo || (property.views !== undefined && property.views > 0)) && (
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                  {timeAgo && (
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Listed {timeAgo}
                    </div>
                  )}
                  {property.views !== undefined && property.views > 0 && (
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      {Number(property.views).toLocaleString('en-PK')} views
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Heart (Favorite) Button */}
        <button
          onClick={handleHeartClick}
          disabled={favoriteLoading}
          className={`absolute top-[12px] right-[12px] z-20 p-2 rounded-full transition-all duration-300 ${
            isFavorite ? 'bg-red-500 text-white scale-110' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
          } shadow-lg hover:scale-110 ${favoriteLoading ? 'opacity-50 cursor-wait' : ''}`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          type="button"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''} ${favoriteLoading ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          🍞 TOAST NOTIFICATION
      ═══════════════════════════════════════════ */}
      {mounted && toast && (
        <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none">
          <div
            className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-green-500/95 border-green-400/50 text-white'
                : toast.type === 'error'
                ? 'bg-red-500/95 border-red-400/50 text-white'
                : 'bg-[#029bba]/95 border-[#029bba]/50 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <X className="w-5 h-5" />}
            {toast.type === 'info' && <Shield className="w-5 h-5" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {mounted && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseModal}
          propertyImage={currentImage ? getOptimizedImageUrl(currentImage, { width: 200, watermark: true }) : null}
          propertyTitle={title}
          propertyCity={city}
          propertyPrice={getPriceDisplay()}
        />
      )}
    </>
  );
};

export default PropertyCard;
