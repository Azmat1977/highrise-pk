// components/recently-viewed.tsx

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, X, RefreshCw } from 'lucide-react';
import { 
  getRecentlyViewed, 
  getRecentlyViewedSync,
  removeFromRecentlyViewed,
  RecentlyViewedProperty 
} from '@/lib/recently-viewed';

const PRIMARY_COLOR = "#029bba";

const formatPrice = (price: number): string => {
  if (price >= 10000000) {
    return `PKR ${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `PKR ${(price / 100000).toFixed(2)} Lac`;
  }
  return `PKR ${price.toLocaleString()}`;
};

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  return `${Math.floor(diffInHours / 168)}w ago`;
};

export const RecentlyViewed: React.FC = () => {
  const [items, setItems] = useState<RecentlyViewedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = async () => {
    // First load from localStorage (instant)
    const localItems = getRecentlyViewedSync();
    if (localItems.length > 0) {
      setItems(localItems);
      setIsLoading(false);
    }

    // Then try to fetch from backend (for logged-in users)
    try {
      const backendItems = await getRecentlyViewed();
      setItems(backendItems);
    } catch (error) {
      console.error('Failed to fetch recently viewed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (propertyId: string) => {
    setIsRemoving(propertyId);
    try {
      await removeFromRecentlyViewed(propertyId);
      const updatedItems = await getRecentlyViewed();
      setItems(updatedItems);
    } catch (error) {
      console.error('Failed to remove:', error);
      // Fallback to sync version
      const updatedItems = getRecentlyViewedSync();
      setItems(updatedItems);
    } finally {
      setIsRemoving(null);
    }
  };

  // Don't hide section while loading, show skeleton instead
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
            <h2 className="text-2xl font-bold text-gray-900">
              Recently Viewed
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            )}
            <span className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'property' : 'properties'}
            </span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && items.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-32 bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const imageUrl = Array.isArray(item.images) && item.images.length > 0
              ? (typeof item.images[0] === 'string' 
                  ? item.images[0] 
                  : (item.images[0] as any)?.url)
              : null;

            const href = item.slug ? `/property/${item.slug}` : `/property/${item._id}`;

            return (
              <div
                key={item._id}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(item._id);
                  }}
                  disabled={isRemoving === item._id}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-red-500 shadow-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-not-allowed"
                  aria-label="Remove from recently viewed"
                >
                  {isRemoving === item._id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </button>

                <Link href={href}>
                  <div className="relative h-32 bg-gray-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-xs">No Image</span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-white">
                        {formatTimeAgo(item.viewedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 mb-1 group-hover:text-[#029bba] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {item.city}
                    </p>
                    <p 
                      className="text-sm font-bold"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
