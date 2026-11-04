import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CityCarouselControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
  className?: string;
}

export default function CityCarouselControls({
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  className = '',
}: CityCarouselControlsProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} role="navigation" aria-label="City carousel navigation">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        aria-label="Previous cities"
        aria-controls="cities-carousel-track"
        className={`rounded-xl border border-navy-100 bg-white p-2.5 text-navy-700 shadow-sm transition-colors hover:border-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:border-navy-50 disabled:text-navy-300 ${!canPrevious ? '' : 'hover:bg-navy-800 hover:border-navy-800'}`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next cities"
        aria-controls="cities-carousel-track"
        className={`rounded-xl border border-navy-100 bg-white p-2.5 text-navy-700 shadow-sm transition-colors hover:border-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:border-navy-50 disabled:text-navy-300 ${!canNext ? '' : 'hover:bg-navy-800 hover:border-navy-800'}`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}