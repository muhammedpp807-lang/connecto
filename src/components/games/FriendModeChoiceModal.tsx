import React from 'react';
import { X, Wifi, Smartphone, ChevronRight, Users, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface FriendModeChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOffline: () => void;
  onSelectOnline: () => void;
}

export const FriendModeChoiceModal: React.FC<FriendModeChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectOffline,
  onSelectOnline
}) => {
  const { colorConfig } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: `${colorConfig.primaryHex}15`, color: colorConfig.primaryHex }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Play with Friends</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose your multiplayer experience</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Options */}
        <div className="p-6 space-y-4">
          {/* Option 1: Offline Pass & Play */}
          <button
            type="button"
            id="btn-play-offline"
            onClick={() => {
              onClose();
              onSelectOffline();
            }}
            className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-[#19242b] hover:bg-slate-100 dark:hover:bg-[#202c33] border border-slate-200/80 dark:border-[#2a3942] flex items-center justify-between gap-4 transition cursor-pointer group shadow-xs text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">1️⃣ Play with Friend Offline</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                    Pass & Play
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Two people play together on this device. No internet required.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>

          {/* Option 2: Online Multiplayer */}
          <button
            type="button"
            id="btn-play-online"
            onClick={() => {
              onClose();
              onSelectOnline();
            }}
            className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-[#19242b] hover:bg-slate-100 dark:hover:bg-[#202c33] border border-slate-200/80 dark:border-[#2a3942] flex items-center justify-between gap-4 transition cursor-pointer group shadow-xs text-left"
          >
            <div className="flex items-center gap-4">
              <div 
                style={{ backgroundColor: `${colorConfig.primaryHex}15`, color: colorConfig.primaryHex }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
              >
                <Wifi className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">2️⃣ Play with Friend Online</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    Live 🌐
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Invite an online contact for real-time moves & live notifications.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
