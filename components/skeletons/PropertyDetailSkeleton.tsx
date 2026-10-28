// components/skeletons/PropertyDetailSkeleton.tsx
import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar } from './Skeleton';

export const PropertyDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Top Bar Skeleton */}
      <div className="bg-white shadow-sm">
        <div className="page-container py-3">
          <Skeleton height={20} width={80} className="rounded" />
        </div>
      </div>

      <div className="section">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery Skeleton */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="h-64 sm:h-80 md:h-[400px] bg-gray-200 animate-pulse" />
              
              {/* Thumbnail Row */}
              <div className="flex gap-2 p-3 bg-gray-50">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} width={64} height={48} className="rounded-lg flex-shrink-0" />
                ))}
              </div>
            </div>

            {/* Header/Overview Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="space-y-4">
                {/* Title */}
                <Skeleton height={32} width="80%" className="rounded" />
                
                {/* Location */}
                <Skeleton height={20} width="60%" className="rounded" />

                {/* Price */}
                <Skeleton height={36} width="40%" className="rounded" />

                {/* Key Facts */}
                <div className="flex flex-wrap gap-2 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height={32} width={100} className="rounded-full" />
                  ))}
                </div>
              </div>
            </div>

            {/* Details Card Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Skeleton height={24} width={150} className="rounded mb-4" />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <Skeleton height={12} width={60} className="rounded mb-2" />
                    <Skeleton height={16} width="80%" className="rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Location Card Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Skeleton height={24} width={100} className="rounded mb-4" />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <Skeleton height={12} width={40} className="rounded mb-2" />
                    <Skeleton height={16} width="90%" className="rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Skeleton height={24} width={120} className="rounded mb-4" />
              <SkeletonText lines={8} />
            </div>
          </div>

          {/* Right Column - Contact Card Skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Skeleton height={24} width={140} className="rounded mb-4" />

              {/* Owner Info */}
              <div className="flex items-center gap-3 mb-6">
                <SkeletonAvatar size={56} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={16} width="70%" className="rounded" />
                  <Skeleton height={12} width="50%" className="rounded" />
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <Skeleton height={48} className="rounded-lg" />
                <Skeleton height={48} className="rounded-lg" />
                <Skeleton height={48} className="rounded-lg" />
              </div>
            </div>

            {/* Safety Tips Skeleton */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <Skeleton height={20} width={100} className="rounded mb-3" />
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
