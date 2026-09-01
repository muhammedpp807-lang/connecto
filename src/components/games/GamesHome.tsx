import React from 'react';
import { 
  Bot, 
  Users, 
  Trophy, 
  Sparkles, 
  Gamepad2, 
  History, 
  Flame,
  Swords,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GameHistoryItem } from '../../types';

interface GamesHomeProps {
  onSelectRobot: () => void;
  onSelectFriends: () => void;
  onViewHistory: () => void;
  history: GameHistoryItem[];
}

export const GamesHome: React.FC<GamesHomeProps> = ({
  onSelectRobot,
  onSelectFriends,
  onViewHistory,
  history
}) => {
  const { colorConfig } = useTheme();

  // Quick stats calculation
  const totalGames = history.length;
  const wins = history.filter((h) => h.result === 'won').length;
  const losses = history.filter((h) => h.result === 'lost').length;
  const draws = history.filter((h) => h.result === 'draw').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] dark:from-[#0b141a] dark:to-[#080d11] text-slate-900 dark:text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header Banner */}
        <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-[#1f2c34]">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <div 
                style={{ backgroundColor: `${colorConfig.primaryHex}18`, color: colorConfig.primaryHex }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              >
                <Gamepad2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Games
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Choose how you want to play & challenge friends or AI
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onViewHistory}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#111b21] hover:bg-slate-50 dark:hover:bg-[#19242b] border border-slate-200 dark:border-[#1f2c34] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <History className="w-4 h-4 text-amber-500" />
              <span>Match History ({totalGames})</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200/80 dark:border-[#1f2c34] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Wins</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{wins}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200/80 dark:border-[#1f2c34] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Win Rate</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{winRate}%</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200/80 dark:border-[#1f2c34] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Losses</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{losses}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200/80 dark:border-[#1f2c34] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Draws</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{draws}</p>
            </div>
          </div>
        </div>

        {/* Featured Game Card: Tic-Tac-Toe */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] shadow-xl p-6 sm:p-8 transition-all">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Info */}
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Multiplayer & AI Ready</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-1.5 p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    X
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    O
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Tic-Tac-Toe
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                    Classic 3×3 strategy game
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Challenge your tactical skills! Play against our smart Minimax Robot AI or battle your friends in real-time online multiplayer and local 2-player pass-and-play.
              </p>

              {/* Special Draw rule hint */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#19242b] border border-slate-200/70 dark:border-[#2a3942] text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <span className="text-amber-500 text-sm font-bold">💡</span>
                <span>
                  <strong>Draw Rematch Rule:</strong> When a game ends in a draw, the opponent of the previous starter gets the first turn in the next round!
                </span>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
              <button
                type="button"
                id="btn-play-robot"
                onClick={onSelectRobot}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="w-full py-4 px-6 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg hover:opacity-95 active:scale-98 transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div className="text-left flex-1">
                  <p className="font-extrabold text-sm">Play with Robot</p>
                  <p className="text-[10px] text-white/80 font-medium">Challenge the Smart AI</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                id="btn-play-friends"
                onClick={onSelectFriends}
                className="w-full py-4 px-6 rounded-2xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-900 dark:text-white font-black text-sm flex items-center justify-center gap-3 border border-slate-200 dark:border-[#2a3942] shadow-xs active:scale-98 transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-lg">
                  👥
                </div>
                <div className="text-left flex-1">
                  <p className="font-extrabold text-sm">Play with Friends</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Online & Offline 2-Player</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Real-Time Multiplayer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Instant invites sent through notification bar with synchronous live board sync.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              🧠
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Smart Minimax AI</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Analyzes possible moves to counter attacks and provide a fun, strategic challenge.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              📱
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pass & Play Offline</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Play together on the same screen anytime without an internet connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
