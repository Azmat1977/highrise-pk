// ========== FILE: components/admin/campaigns/EmojiPicker.tsx ==========
// 😀 ENTERPRISE EMOJI PICKER — HIGHRISE.PK
// Curated emoji palette for real estate email subjects
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Zero external dependencies (no bloat)
//   ✅ Curated categories — real estate optimized
//   ✅ Popular emojis prioritized for property/finance context
//   ✅ Tab-based category navigation
//   ✅ Search functionality
//   ✅ Recent emojis tracking (localStorage)
//   ✅ Click outside to close
//   ✅ Keyboard navigation (Esc closes)
//   ✅ Positioned dropdown (not modal)
//   ✅ Mobile responsive
//   ✅ Hover tooltips with emoji names
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Smile,
  Home,
  DollarSign,
  TrendingUp,
  Bell,
  Search,
  Clock,
  X,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface EmojiPickerProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSelect: (emoji: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

interface EmojiEntry {
  emoji: string;
  name:  string;
}

interface EmojiCategory {
  id:     string;
  name:   string;
  icon:   React.ReactNode;
  emojis: EmojiEntry[];
}

// ═══════════════════════════════════════════════════════════════
// 🎨 CURATED EMOJI CATEGORIES
// Optimized for Pakistani real estate email marketing
// ═══════════════════════════════════════════════════════════════

const CATEGORIES: EmojiCategory[] = [
  // ─────────────────────────────────────────────
  // PROPERTY & HOME
  // ─────────────────────────────────────────────
  {
    id: 'property',
    name: 'Property',
    icon: <Home className="w-4 h-4" />,
    emojis: [
      { emoji: '🏠', name: 'House' },
      { emoji: '🏡', name: 'House with garden' },
      { emoji: '🏢', name: 'Office building' },
      { emoji: '🏣', name: 'Japanese post office' },
      { emoji: '🏤', name: 'Post office' },
      { emoji: '🏥', name: 'Hospital' },
      { emoji: '🏦', name: 'Bank' },
      { emoji: '🏨', name: 'Hotel' },
      { emoji: '🏩', name: 'Love hotel' },
      { emoji: '🏪', name: 'Convenience store' },
      { emoji: '🏫', name: 'School' },
      { emoji: '🏬', name: 'Department store' },
      { emoji: '🏭', name: 'Factory' },
      { emoji: '🏯', name: 'Japanese castle' },
      { emoji: '🏰', name: 'European castle' },
      { emoji: '🏗️', name: 'Construction' },
      { emoji: '🏘️', name: 'Houses' },
      { emoji: '🏚️', name: 'Derelict house' },
      { emoji: '🌆', name: 'Cityscape at dusk' },
      { emoji: '🌇', name: 'Sunset' },
      { emoji: '🌃', name: 'Night with stars' },
      { emoji: '🌉', name: 'Bridge at night' },
      { emoji: '🗼', name: 'Tower' },
      { emoji: '🗽', name: 'Statue of Liberty' },
      { emoji: '⛩️', name: 'Shinto shrine' },
      { emoji: '🕌', name: 'Mosque' },
      { emoji: '🛖', name: 'Hut' },
      { emoji: '🔑', name: 'Key' },
      { emoji: '🗝️', name: 'Old key' },
      { emoji: '🚪', name: 'Door' },
    ],
  },

  // ─────────────────────────────────────────────
  // MONEY & FINANCE
  // ─────────────────────────────────────────────
  {
    id: 'money',
    name: 'Money',
    icon: <DollarSign className="w-4 h-4" />,
    emojis: [
      { emoji: '💰', name: 'Money bag' },
      { emoji: '💵', name: 'Dollar banknote' },
      { emoji: '💴', name: 'Yen banknote' },
      { emoji: '💶', name: 'Euro banknote' },
      { emoji: '💷', name: 'Pound banknote' },
      { emoji: '💸', name: 'Money with wings' },
      { emoji: '💳', name: 'Credit card' },
      { emoji: '🧾', name: 'Receipt' },
      { emoji: '💎', name: 'Gem stone' },
      { emoji: '⚖️', name: 'Balance scale' },
      { emoji: '💼', name: 'Briefcase' },
      { emoji: '📈', name: 'Chart up' },
      { emoji: '📉', name: 'Chart down' },
      { emoji: '📊', name: 'Bar chart' },
      { emoji: '💹', name: 'Chart with yen' },
      { emoji: '🏷️', name: 'Label' },
      { emoji: '🎫', name: 'Ticket' },
      { emoji: '🪙', name: 'Coin' },
      { emoji: '📆', name: 'Tear-off calendar' },
      { emoji: '📅', name: 'Calendar' },
    ],
  },

  // ─────────────────────────────────────────────
  // TRENDING & ANALYTICS
  // ─────────────────────────────────────────────
  {
    id: 'trending',
    name: 'Trending',
    icon: <TrendingUp className="w-4 h-4" />,
    emojis: [
      { emoji: '🔥', name: 'Fire' },
      { emoji: '⭐', name: 'Star' },
      { emoji: '🌟', name: 'Glowing star' },
      { emoji: '✨', name: 'Sparkles' },
      { emoji: '💫', name: 'Dizzy' },
      { emoji: '🎯', name: 'Target' },
      { emoji: '🏆', name: 'Trophy' },
      { emoji: '🥇', name: 'Gold medal' },
      { emoji: '🥈', name: 'Silver medal' },
      { emoji: '🥉', name: 'Bronze medal' },
      { emoji: '🎖️', name: 'Military medal' },
      { emoji: '🏅', name: 'Sports medal' },
      { emoji: '👑', name: 'Crown' },
      { emoji: '💯', name: '100 points' },
      { emoji: '🚀', name: 'Rocket' },
      { emoji: '⚡', name: 'Lightning' },
      { emoji: '💥', name: 'Collision' },
      { emoji: '🌈', name: 'Rainbow' },
      { emoji: '🎉', name: 'Party popper' },
      { emoji: '🎊', name: 'Confetti ball' },
    ],
  },

  // ─────────────────────────────────────────────
  // ALERTS & NOTIFICATIONS
  // ─────────────────────────────────────────────
  {
    id: 'alerts',
    name: 'Alerts',
    icon: <Bell className="w-4 h-4" />,
    emojis: [
      { emoji: '🔔', name: 'Bell' },
      { emoji: '🔕', name: 'Bell with slash' },
      { emoji: '📢', name: 'Loudspeaker' },
      { emoji: '📣', name: 'Megaphone' },
      { emoji: '📯', name: 'Postal horn' },
      { emoji: '⚠️', name: 'Warning' },
      { emoji: '🚨', name: 'Police light' },
      { emoji: '🔴', name: 'Red circle' },
      { emoji: '🟢', name: 'Green circle' },
      { emoji: '🟡', name: 'Yellow circle' },
      { emoji: '🟠', name: 'Orange circle' },
      { emoji: '🟣', name: 'Purple circle' },
      { emoji: '🔵', name: 'Blue circle' },
      { emoji: '⚫', name: 'Black circle' },
      { emoji: '⚪', name: 'White circle' },
      { emoji: '❗', name: 'Exclamation' },
      { emoji: '❓', name: 'Question' },
      { emoji: '✅', name: 'Check mark' },
      { emoji: '❌', name: 'Cross mark' },
      { emoji: '⏰', name: 'Alarm clock' },
      { emoji: '⌛', name: 'Hourglass done' },
      { emoji: '⏳', name: 'Hourglass' },
      { emoji: '⏱️', name: 'Stopwatch' },
      { emoji: '📆', name: 'Calendar date' },
      { emoji: '🗓️', name: 'Spiral calendar' },
    ],
  },

  // ─────────────────────────────────────────────
  // FACES & GREETINGS
  // ─────────────────────────────────────────────
  {
    id: 'faces',
    name: 'Faces',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      { emoji: '😀', name: 'Grinning face' },
      { emoji: '😃', name: 'Grinning with big eyes' },
      { emoji: '😄', name: 'Grinning with smiling eyes' },
      { emoji: '😁', name: 'Beaming face' },
      { emoji: '😊', name: 'Smiling with smiling eyes' },
      { emoji: '😇', name: 'Smiling with halo' },
      { emoji: '🙂', name: 'Slightly smiling' },
      { emoji: '😉', name: 'Winking face' },
      { emoji: '🥰', name: 'Smiling with hearts' },
      { emoji: '😍', name: 'Smiling with heart eyes' },
      { emoji: '🤩', name: 'Star-struck' },
      { emoji: '😘', name: 'Face blowing kiss' },
      { emoji: '👍', name: 'Thumbs up' },
      { emoji: '👏', name: 'Clapping hands' },
      { emoji: '🙌', name: 'Raising hands' },
      { emoji: '🤝', name: 'Handshake' },
      { emoji: '🙏', name: 'Folded hands' },
      { emoji: '💪', name: 'Flexed biceps' },
      { emoji: '👋', name: 'Waving hand' },
      { emoji: '✌️', name: 'Victory hand' },
      { emoji: '❤️', name: 'Red heart' },
      { emoji: '🧡', name: 'Orange heart' },
      { emoji: '💛', name: 'Yellow heart' },
      { emoji: '💚', name: 'Green heart' },
      { emoji: '💙', name: 'Blue heart' },
      { emoji: '💜', name: 'Purple heart' },
    ],
  },
];

const RECENT_KEY = 'highrise_emoji_recent';
const MAX_RECENT = 24;

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  anchorRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('property');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [recent,         setRecent]         = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────
  // Load recent emojis from localStorage
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecent(parsed.slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ─────────────────────────────────────────────
  // Click outside + Escape key handler
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        // Don't close if clicking the anchor button
        if (anchorRef?.current && anchorRef.current.contains(target)) return;
        onClose();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, anchorRef]);

  // ─────────────────────────────────────────────
  // Handle emoji selection
  // ─────────────────────────────────────────────
  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);

    // Update recent list
    const updated = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    setRecent(updated);

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors (quota, private mode)
    }
  };

  // ─────────────────────────────────────────────
  // Filter emojis by search query
  // ─────────────────────────────────────────────
  const getFilteredEmojis = (): EmojiEntry[] => {
    if (!searchQuery.trim()) {
      const category = CATEGORIES.find((c) => c.id === activeCategory);
      return category?.emojis || [];
    }

    const query = searchQuery.toLowerCase().trim();
    const allEmojis = CATEGORIES.flatMap((c) => c.emojis);
    return allEmojis.filter((e) =>
      e.name.toLowerCase().includes(query) || e.emoji.includes(query)
    );
  };

  if (!isOpen) return null;

  const filteredEmojis = getFilteredEmojis();

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 mt-2 w-80 bg-white rounded-2xl 
                 shadow-2xl border border-gray-200 overflow-hidden"
      style={{ maxHeight: '420px' }}
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-[#004063] 
                         flex items-center gap-1.5">
            <Smile className="w-4 h-4 text-[#029bba]" />
            Add Emoji
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 
                             w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border 
                       border-gray-200 focus:ring-2 
                       focus:ring-[#029bba]/20 focus:border-[#029bba] 
                       outline-none text-sm bg-gray-50"
          />
        </div>
      </div>

      {/* Category Tabs — hidden when searching */}
      {!searchQuery.trim() && (
        <div className="flex items-center border-b border-gray-200 
                        bg-gray-50 overflow-x-auto">
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategory('recent')}
              className={`
                flex-shrink-0 flex items-center justify-center gap-1 
                py-2 px-3 text-xs font-semibold transition-all
                ${activeCategory === 'recent'
                  ? 'text-[#029bba] border-b-2 border-[#029bba] bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
              title="Recent"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`
                flex-shrink-0 flex items-center justify-center gap-1 
                py-2 px-3 text-xs font-semibold transition-all
                ${activeCategory === category.id
                  ? 'text-[#029bba] border-b-2 border-[#029bba] bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: '260px' }}>
        {activeCategory === 'recent' && !searchQuery.trim() && (
          <>
            {recent.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No recent emojis yet
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {recent.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="w-8 h-8 flex items-center justify-center 
                               text-xl hover:bg-gray-100 rounded-lg 
                               transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {activeCategory !== 'recent' && (
          <>
            {filteredEmojis.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                No emojis found for "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map((item, index) => (
                  <button
                    key={`${item.emoji}-${index}`}
                    type="button"
                    onClick={() => handleEmojiClick(item.emoji)}
                    title={item.name}
                    className="w-8 h-8 flex items-center justify-center 
                               text-xl hover:bg-gray-100 rounded-lg 
                               transition-colors"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          💡 Emojis boost email open rates by up to 56%
        </p>
      </div>
    </div>
  );
};

export default EmojiPicker;
// ========== END OF FILE ==========