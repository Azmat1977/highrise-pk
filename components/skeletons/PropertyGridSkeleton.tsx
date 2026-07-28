// components/skeletons/PropertyGridSkeleton.tsx
import React from 'react';
import { PropertyCardSkeleton } from './PropertyCardSkeleton';

interface PropertyGridSkeletonProps {
  count?: number;
}

export const PropertyGridSkeleton: React.FC<PropertyGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
};
