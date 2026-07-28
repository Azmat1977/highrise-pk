// components/skeletons/PropertyCardSkeleton.tsx
import React from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      {/* Image Skeleton */}
      <div className="relative h-52 bg-gray-200" />

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Price */}
        <Skeleton height={24} width="40%" className="rounded" />

        {/* Title */}
        <Skeleton height={20} width="85%" className="rounded" />

        {/* Location */}
        <Skeleton height={16} width="60%" className="rounded" />

        {/* Features (Beds, Baths, Area) */}
        <div className="flex gap-4 pt-2">
          <Skeleton height={16} width={60} className="rounded" />
          <Skeleton height={16} width={60} className="rounded" />
          <Skeleton height={16} width={80} className="rounded" />
        </div>

        {/* Listing Type Badge */}
        <div className="pt-2">
          <Skeleton height={24} width={100} className="rounded-full" />
        </div>
      </div>
    </div>
  );
};
