import React, { useState } from 'react';
import { X, Play, Users, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { TicTacToeSymbol } from '../../types';

interface OfflineSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (p1Name: string, p2Name: string, p1Symbol: TicTacToeSymbol) => void;
  defaultP1Name?: string;
}

export const OfflineSetupModal: React.FC<OfflineSetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  defaultP1Name = 'Player 1'
}) => {
  const { colorConfig } = useTheme();
  const [p1Name, setP1Name] = useState(defaultP1Name);
  const [p2Name, setP2Name] = useState('Player 2');
  const [p1Symbol, setP1Symbol] = useState<TicTacToeSymbol>('X');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGame(p1Name.trim() || 'Player 1', p2Name.trim() || 'Player 2', p1Symbol);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              👥
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Offline Pass & Play</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Play together on the same screen</p>
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
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
              required
            />
          </div>

          {/* Symbol Choice for Player 1 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Player 1 Symbol & First Turn
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setP1Symbol('X')}
                className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition cursor-pointer ${
                  p1Symbol === 'X'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#19242b]'
                }`}
              >
                <span className="text-2xl font-black">❌</span>
                <span className="text-xs font-bold">X (Starts First)</span>
              </button>

              <button
                type="button"
                onClick={() => setP1Symbol('O')}
                className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition cursor-pointer ${
                  p1Symbol === 'O'
                    ? 'border-pink-600 bg-pink-50/80 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#19242b]'
                }`}
              >
                <span className="text-2xl font-black">⭕</span>
                <span className="text-xs font-bold">O (Starts Second)</span>
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
                Gets {p1Symbol === 'X' ? '⭕ (O)' : '❌ (X)'}
              </span>
            </div>
            <input
              type="text"
              value={p2Name}
              onChange={(e) => setP2Name(e.target.value)}
              placeholder="Player 2"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202c33] border border-slate-200 dark:border-[#2a3942] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
              required
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              style={{ backgroundColor: colorConfig.primaryHex }}
              className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-98 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Game</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
