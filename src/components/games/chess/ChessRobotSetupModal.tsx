import React, { useState } from 'react';
import { X, Play, Bot, Sparkles, Shield, Swords, Zap } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ChessDifficulty } from '../../../types';

interface ChessRobotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (difficulty: ChessDifficulty, playerColor: 'w' | 'b', timerMinutes?: number) => void;
}

export const ChessRobotSetupModal: React.FC<ChessRobotSetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame
}) => {
  const { colorConfig } = useTheme();
  const [difficulty, setDifficulty] = useState<ChessDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [timerMinutes, setTimerMinutes] = useState<number>(10);

  if (!isOpen) return null;

  const difficulties: {
    id: ChessDifficulty;
    name: string;
    level: string;
    desc: string;
    badgeColor: string;
    icon: string;
  }[] = [
    {
      id: 'easy',
      name: 'Easy',
      level: '🟢 Beginner',
      desc: 'Forgiving tactical play, great for practicing openings and simple tactics.',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
      icon: '🌱'
    },
    {
      id: 'medium',
      name: 'Medium',
      level: '🟡 Tactical',
      desc: 'Solid position evaluation with Minimax & Piece-Square tables.',
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
      icon: '⚔️'
    },
    {
      id: 'hard',
      name: 'Hard',
      level: '🔴 Master',
      desc: 'Deep Alpha-Beta pruning + tactical capture quiescence search.',
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
      icon: '🛡️'
    },
    {
      id: 'expert',
      name: 'Expert',
      level: '🟣 Grandmaster',
      desc: 'Deep multi-ply search with advanced move ordering and endgame awareness.',
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
      icon: '👑'
    }
  ];

  const handleStart = () => {
    onStartGame(difficulty, playerColor, timerMinutes === 0 ? undefined : timerMinutes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: `${colorConfig.primaryHex}18`, color: colorConfig.primaryHex }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Play Chess with Robot</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose AI difficulty and your pieces</p>
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Difficulty options */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Robot AI Difficulty
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {difficulties.map((diff) => {
                const isSelected = difficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setDifficulty(diff.id)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#19242b] hover:bg-slate-100 dark:hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{diff.icon}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${diff.badgeColor}`}>
                        {diff.name}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mb-0.5">
                        {diff.level}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2 font-medium">
                        {diff.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Play As
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlayerColor('w')}
                className={`py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition cursor-pointer ${
                  playerColor === 'w'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#19242b] text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-xl">♔</span>
                <span className="text-xs font-bold">White (Moves 1st)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlayerColor('b')}
                className={`py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition cursor-pointer ${
                  playerColor === 'b'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black shadow-xs'
                    : 'border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#19242b] text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-xl">♚</span>
                <span className="text-xs font-bold">Black (Moves 2nd)</span>
              </button>
            </div>
          </div>

          {/* Time control */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-[#1f2c34] flex-shrink-0">
          <button
            type="button"
            onClick={handleStart}
            style={{ backgroundColor: colorConfig.primaryHex }}
            className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-98 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Match vs Robot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
