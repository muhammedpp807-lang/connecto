import React, { useState } from 'react';
import { X, Play, Users, Clock } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ChessOfflineSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (p1Name: string, p2Name: string, p1Color: 'w' | 'b', timerMinutes?: number) => void;
  defaultP1Name?: string;
}

export const ChessOfflineSetupModal: React.FC<ChessOfflineSetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  defaultP1Name = 'Player 1'
}) => {
  const { colorConfig } = useTheme();
  const [p1Name, setP1Name] = useState(defaultP1Name);
  const [p2Name, setP2Name] = useState('Player 2');
  const [p1Color, setP1Color] = useState<'w' | 'b'>('w');
  const [timerMinutes, setTimerMinutes] = useState<number>(10);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGame(
      p1Name.trim() || 'Player 1',
      p2Name.trim() || 'Player 2',
      p1Color,
      timerMinutes === 0 ? undefined : timerMinutes
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xl">
              ♟️
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Offline Pass & Play Chess</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Play together on this device</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Player 1 Details */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Player 1 Name
            </label>
            <input
              type="text"
              value={p1Name}
              onChange={(e) => setP1Name(e.target.value)}
              placeholder="Player 1"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none font-medium"
              required
            />
          </div>

          {/* Color Choice for Player 1 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Player 1 Pieces
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setP1Color('w')}
                className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition cursor-pointer ${
                  p1Color === 'w'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#19242b]'
                }`}
              >
                <span className="text-2xl">♔</span>
                <span className="text-xs font-bold">White (Moves 1st)</span>
              </button>

              <button
                type="button"
                onClick={() => setP1Color('b')}
                className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition cursor-pointer ${
                  p1Color === 'b'
                    ? 'border-pink-600 bg-pink-50/80 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#19242b]'
                }`}
              >
                <span className="text-2xl">♚</span>
                <span className="text-xs font-bold">Black (Moves 2nd)</span>
              </button>
            </div>
          </div>

          {/* Player 2 Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Player 2 Name
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                Gets {p1Color === 'w' ? '♚ Black' : '♔ White'}
              </span>
            </div>
            <input
              type="text"
              value={p2Name}
              onChange={(e) => setP2Name(e.target.value)}
              placeholder="Player 2"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none font-medium"
              required
            />
          </div>

          {/* Timer Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Clock Timer
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { min: 5, label: '5 min' },
                { min: 10, label: '10 min' },
                { min: 15, label: '15 min' },
                { min: 0, label: 'Unlimited' }
              ].map((t) => (
                <button
                  key={t.min}
                  type="button"
                  onClick={() => setTimerMinutes(t.min)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    timerMinutes === t.min
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black'
                      : 'border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#19242b] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              style={{ backgroundColor: colorConfig.primaryHex }}
              className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-98 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Chess Match</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
