import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface EmojiPickerModalProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Popular': ['😀', '😂', '😍', '🔥', '👍', '🎉', '🚀', '❤️', '👏', '🙌', '😎', '🙏', '✨', '💯', '🤩', '🥳'],
  'Smileys & Emotion': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🫡', '🤐', '😴', '🤤', '😷', '🤒', '🤕'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙌', '👐', '🤲', '👏', '🙏', '✍️', '💪'],
  'Symbols & Objects': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐️', '🌟', '💥', '🔥', '⚡️', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '💻', '📱', '📷', '💡', '🔔', '🔒', '🔑', '🚀', '✈️', '🚗', '☕️', '🍕', '🍔']
};

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Popular');
  const [search, setSearch] = useState('');

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const displayedEmojis = search
    ? allEmojis.filter((e) => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory];

  return (
    <div className="absolute bottom-16 left-4 z-40 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl mr-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close emoji picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      {!search && (
        <div className="flex px-2 pt-2 gap-1 border-b border-slate-100 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat as keyof typeof EMOJI_CATEGORIES)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-medium transition ${
                activeCategory === cat
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-3 max-h-48 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1 text-xl">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center transform active:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
