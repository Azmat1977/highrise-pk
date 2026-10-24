import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  MapPin, 
  Building, 
  DollarSign, 
  Trash2, 
  RotateCcw, 
  ArrowRight, 
  Clock, 
  Tag,
  Home,
  SlidersHorizontal,
  X,
  Sparkles
} from 'lucide-react';
import { 
  RecentSearchCriteria, 
  getRecentSearches, 
  removeRecentSearch, 
  clearRecentSearches, 
  resetToDefaultSearches, 
  formatRelativeTime,
  RECENT_SEARCHES_EVENT 
} from '../utils/recentSearches.ts';

interface RecentSearchesShelfProps {
  onSearchClick?: (search: RecentSearchCriteria) => void;
  className?: string;
}

export const RecentSearchesShelf: React.FC<RecentSearchesShelfProps> = ({
  onSearchClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const [searches, setSearches] = useState<RecentSearchCriteria[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'rent' | 'project'>('all');

  const loadSearches = () => {
    setSearches(getRecentSearches());
  };

  useEffect(() => {
    loadSearches();

    const handleUpdate = () => {
      loadSearches();
    };

    window.addEventListener(RECENT_SEARCHES_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_EVENT, handleUpdate);
    };
  }, []);

  const handleRevisit = (search: RecentSearchCriteria) => {
    if (onSearchClick) {
      onSearchClick(search);
    }
    navigate(search.url);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(id);
    setSearches(updated);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setSearches([]);
  };

  const handleResetDefaults = () => {
    const defaults = resetToDefaultSearches();
    setSearches(defaults);
  };

  // Filter searches by tab if needed
  const filteredSearches = searches.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.purpose === activeFilter;
  });

  return (
    <div className={`bg-gradient-to-r from-slate-50 via-white to-[#004063]/5 rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#004063] text-white flex items-center justify-center shadow-xs">
            <History className="w-5 h-5 text-[#38aec7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                Recent Searches & Criteria
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#004063]/10 text-[#004063]">
                {searches.length} saved
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quickly resume where you left off with one-click filter restoration
            </p>
          </div>
        </div>

        {/* Filter Pills and Clear Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {searches.length > 0 && (
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-white text-[#004063] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('buy')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  activeFilter === 'buy'
                    ? 'bg-white text-[#004063] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('rent')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  activeFilter === 'rent'
                    ? 'bg-white text-[#029bba] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rent
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('project')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  activeFilter === 'project'
                    ? 'bg-white text-[#007196] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Projects
              </button>
            </div>
          )}

          {searches.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
              title="Clear all recent searches"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#004063] hover:bg-[#029bba] text-white transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Popular Criteria</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards List / Grid */}
      {filteredSearches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {filteredSearches.map((item) => {
            const isBuy = item.purpose === 'buy';
            const isRent = item.purpose === 'rent';
            const isProject = item.purpose === 'project';

            const badgeBg = isBuy
              ? 'bg-[#004063] text-white'
              : isRent
              ? 'bg-[#029bba] text-white'
              : 'bg-[#007196] text-white';

            return (
              <div
                key={item.id}
                onClick={() => handleRevisit(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRevisit(item);
                  }
                }}
                className="group relative bg-white rounded-2xl border border-slate-200 hover:border-[#004063] p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left"
              >
                {/* Top Row: Purpose Tag, Time, and Dismiss Button */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
                      {item.purpose.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, item.id)}
                    aria-label={`Remove search ${item.label}`}
                    className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Title & Location */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm group-hover:text-[#004063] transition-colors leading-snug">
                    <MapPin className="w-3.5 h-3.5 text-[#029bba] shrink-0" />
                    <span className="truncate">
                      {item.city} {item.area ? `• ${item.area}` : ''}
                    </span>
                  </div>

                  {/* Criteria Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.categoryLabel && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60">
                        {item.categoryLabel}
                      </span>
                    )}
                    {item.bedrooms && item.bedrooms !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60">
                        {item.bedrooms} Beds
                      </span>
                    )}
                    {item.maxPriceLabel && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60">
                        {item.maxPriceLabel}
                      </span>
                    )}
                    {item.status && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[#004063] text-[10px] font-medium border border-blue-200/60">
                        {item.status.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Revisit Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#004063] group-hover:text-[#029bba] transition-colors">
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    <span>Revisit Criteria</span>
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-[#004063] group-hover:text-white flex items-center justify-center transition-all">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 bg-white/70 rounded-2xl border border-dashed border-slate-200 mt-4 px-4">
          <div className="w-12 h-12 rounded-2xl bg-[#004063]/5 text-[#004063] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-[#029bba]" />
          </div>
          <h4 className="font-heading font-bold text-slate-800 text-sm">
            No Recent Searches Recorded
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
            As you search properties and explore cities across Pakistan, your active filters and search criteria will be saved here for instant re-access.
          </p>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#004063] hover:bg-[#029bba] text-white transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Suggested Property Searches</span>
          </button>
        </div>
      )}
    </div>
  );
};
