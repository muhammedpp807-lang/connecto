import React, { useState } from 'react';
import { X, Search, Sparkles, Heart, Laugh, ThumbsUp, Flame, Star, Coffee } from 'lucide-react';

interface StickerPickerModalProps {
  onSelectSticker: (stickerEmoji: string, label: string) => void;
  onClose: () => void;
  replyingToSender?: string;
}

interface StickerItem {
  emoji: string;
  label: string;
  category: string;
}

const STICKER_SETS: Record<string, { icon: React.ReactNode; stickers: StickerItem[] }> = {
  'Reactions': {
    icon: <ThumbsUp className="w-3.5 h-3.5" />,
    stickers: [
      { emoji: '👍', label: 'Thumbs Up', category: 'Reactions' },
      { emoji: '🙌', label: 'Praise', category: 'Reactions' },
      { emoji: '👏', label: 'Applause', category: 'Reactions' },
      { emoji: '🤝', label: 'Deal', category: 'Reactions' },
      { emoji: '🤙', label: 'Call Me', category: 'Reactions' },
      { emoji: '✌️', label: 'Peace', category: 'Reactions' },
      { emoji: '🤞', label: 'Fingers Crossed', category: 'Reactions' },
      { emoji: '💪', label: 'Strong', category: 'Reactions' },
      { emoji: '🫡', label: 'Salute', category: 'Reactions' },
      { emoji: '🙏', label: 'Thank You', category: 'Reactions' },
    ]
  },
  'Celebration': {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    stickers: [
      { emoji: '🎉', label: 'Party Popper', category: 'Celebration' },
      { emoji: '🥳', label: 'Party Face', category: 'Celebration' },
      { emoji: '🚀', label: 'Rocket Launch', category: 'Celebration' },
      { emoji: '✨', label: 'Sparkles', category: 'Celebration' },
      { emoji: '🏆', label: 'Trophy', category: 'Celebration' },
      { emoji: '👑', label: 'Crown', category: 'Celebration' },
      { emoji: '💯', label: 'Hundred', category: 'Celebration' },
      { emoji: '🥂', label: 'Cheers', category: 'Celebration' },
      { emoji: '🎁', label: 'Gift', category: 'Celebration' },
      { emoji: '🎈', label: 'Balloon', category: 'Celebration' },
    ]
  },
  'Love & Mood': {
    icon: <Heart className="w-3.5 h-3.5" />,
    stickers: [
      { emoji: '❤️', label: 'Red Heart', category: 'Love & Mood' },
      { emoji: '💖', label: 'Sparkling Heart', category: 'Love & Mood' },
      { emoji: '🥰', label: 'Smiling with Hearts', category: 'Love & Mood' },
      { emoji: '😍', label: 'Heart Eyes', category: 'Love & Mood' },
      { emoji: '😘', label: 'Blow Kiss', category: 'Love & Mood' },
      { emoji: '🫶', label: 'Heart Hands', category: 'Love & Mood' },
      { emoji: '💐', label: 'Bouquet', category: 'Love & Mood' },
      { emoji: '🌹', label: 'Rose', category: 'Love & Mood' },
      { emoji: '🌟', label: 'Glowing Star', category: 'Love & Mood' },
      { emoji: '💫', label: 'Dizzy Star', category: 'Love & Mood' },
    ]
  },
  'Funny & Energy': {
    icon: <Laugh className="w-3.5 h-3.5" />,
    stickers: [
      { emoji: '😂', label: 'Tears of Joy', category: 'Funny & Energy' },
      { emoji: '🤣', label: 'Rolling on Floor', category: 'Funny & Energy' },
      { emoji: '🔥', label: 'Fire', category: 'Funny & Energy' },
      { emoji: '⚡️', label: 'Lightning', category: 'Funny & Energy' },
      { emoji: '😎', label: 'Cool Shades', category: 'Funny & Energy' },
      { emoji: '🤩', label: 'Star Struck', category: 'Funny & Energy' },
      { emoji: '😜', label: 'Wink Tongue', category: 'Funny & Energy' },
      { emoji: '🤯', label: 'Exploding Head', category: 'Funny & Energy' },
      { emoji: '💀', label: 'Dead / Laughing', category: 'Funny & Energy' },
      { emoji: '👻', label: 'Ghost', category: 'Funny & Energy' },
    ]
  },
  'Vibes & Animals': {
    icon: <Coffee className="w-3.5 h-3.5" />,
    stickers: [
      { emoji: '☕️', label: 'Coffee', category: 'Vibes & Animals' },
      { emoji: '🍕', label: 'Pizza', category: 'Vibes & Animals' },
      { emoji: '🥑', label: 'Avocado', category: 'Vibes & Animals' },
      { emoji: '🍔', label: 'Burger', category: 'Vibes & Animals' },
      { emoji: '🐱', label: 'Cat', category: 'Vibes & Animals' },
      { emoji: '🐶', label: 'Dog', category: 'Vibes & Animals' },
      { emoji: '🦁', label: 'Lion', category: 'Vibes & Animals' },
      { emoji: '🐼', label: 'Panda', category: 'Vibes & Animals' },
      { emoji: '🦄', label: 'Unicorn', category: 'Vibes & Animals' },
      { emoji: '💎', label: 'Diamond', category: 'Vibes & Animals' },
    ]
  }
};

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  onSelectSticker,
  onClose,
  replyingToSender
}) => {
  const [activeTab, setActiveTab] = useState<string>('Reactions');
  const [search, setSearch] = useState('');

  const allStickers = Object.values(STICKER_SETS).flatMap((s) => s.stickers);
  const filteredStickers = search.trim()
    ? allStickers.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.emoji.includes(search)
      )
    : STICKER_SETS[activeTab]?.stickers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#1e2530] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {replyingToSender ? `Reply with Sticker to ${replyingToSender}` : 'Send a Sticker'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any sticker to send instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition"
            aria-label="Close sticker picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 pb-2 border-b border-slate-100 dark:border-[#1e2530]">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0d1117] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-[#1e2530]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search stickers (e.g. fire, party, heart)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              autoFocus
            />
          </div>
        </div>

        {/* Category Tabs */}
        {!search.trim() && (
          <div className="flex px-3 pt-2 gap-1.5 border-b border-slate-100 dark:border-[#1e2530] overflow-x-auto no-scrollbar pb-2">
            {Object.entries(STICKER_SETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === key
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                    : 'bg-slate-100 dark:bg-[#0d1117] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{key}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sticker Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-72">
          {filteredStickers.map((sticker, idx) => (
            <button
              key={`${sticker.emoji}-${idx}`}
              type="button"
              onClick={() => {
                onSelectSticker(sticker.emoji, sticker.label);
                onClose();
              }}
              className="group p-3 rounded-2xl bg-slate-50 dark:bg-[#0d1117] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-[#1e2530] hover:border-emerald-400 dark:hover:border-emerald-600 transition flex flex-col items-center justify-center gap-1 cursor-pointer transform hover:scale-110 active:scale-95 shadow-xs"
              title={sticker.label}
            >
              <span className="text-3xl leading-none select-none group-hover:animate-bounce">
                {sticker.emoji}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate w-full text-center">
                {sticker.label}
              </span>
            </button>
          ))}
          {filteredStickers.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              No stickers found matching "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#0d1117] border-t border-slate-100 dark:border-[#1e2530] flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 px-4">
          <span>{filteredStickers.length} stickers available</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
