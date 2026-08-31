import React from 'react';
import { X, Keyboard, MessageSquare, Shield, HelpCircle, Sparkles, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const { colorConfig } = useTheme();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95 text-slate-800 dark:text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1f2c34] pb-3">
          <div className="flex items-center gap-2">
            <div 
              style={{ backgroundColor: colorConfig.primaryHex }}
              className="w-7 h-7 rounded-full text-white font-black text-sm flex items-center justify-center"
            >
              <HelpCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Help & Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2c34] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" style={{ color: colorConfig.primaryHex }} />
              Quick Shortcuts
            </h4>
            <div className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#1f2c34]">
                <span>Send message</span>
                <span className="bg-slate-100 dark:bg-[#202c33] px-2 py-0.5 rounded text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-transparent">Enter</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#1f2c34]">
                <span>New line in message</span>
                <span className="bg-slate-100 dark:bg-[#202c33] px-2 py-0.5 rounded text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-transparent">Shift + Enter</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#1f2c34]">
                <span>Attachment & Emojis</span>
                <span className="bg-slate-100 dark:bg-[#202c33] px-2 py-0.5 rounded text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-transparent">+ Button</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4" style={{ color: colorConfig.primaryHex }} />
              Status & Messaging
            </h4>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
              Supports full-screen photos and video status viewing with real-time viewers tracking, audio recording, instant message deletions, group channels, and custom wallpapers.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-[#1f2c34]">
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: colorConfig.primaryHex }}
            className="px-5 py-2 rounded-xl text-white font-bold text-xs transition cursor-pointer hover:opacity-90 shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

