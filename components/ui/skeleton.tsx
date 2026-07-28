import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height = 'h-4',
}) => {
  return <div className={`skeleton ${height} ${className}`} />;
};
