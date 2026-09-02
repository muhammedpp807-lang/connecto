import React from 'react';
import { X, Trophy, Swords, Flame, Sparkles, Clock, History, Calendar } from 'lucide-react';
import { GameHistoryItem } from '../../types';
import { Avatar } from '../common/Avatar';

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameHistoryItem[];
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({
  isOpen,
  onClose,
  history
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#1f2c34] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Match History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your past Chess and Tic-Tac-Toe battles & results
              </p>
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

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No match records yet</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Play your first match with the Robot AI or invite a friend to see your stats here!
              </p>
            </div>
          ) : (
            history.map((item) => {
              const dateStr = new Date(item.playedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const isChess = item.gameType === 'chess';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#19242b] border border-slate-200/70 dark:border-[#2a3942] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    {item.mode === 'robot' ? (
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-lg">
                        🤖
                      </div>
                    ) : item.mode === 'offline' ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
                        👥
                      </div>
                    ) : (
                      <Avatar src={item.opponentAvatar} name={item.opponentName} size="sm" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{isChess ? '♟️' : '🎮'}</span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          vs. {item.opponentName}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-[#111b21] text-slate-500 font-bold uppercase">
                          {item.mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                        {isChess && item.movesCount !== undefined && (
                          <>
                            <span>•</span>
                            <span>{item.movesCount} moves</span>
                          </>
                        )}
                        {!isChess && item.roundsPlayed !== undefined && (
                          <>
                            <span>•</span>
                            <span>{item.roundsPlayed} {item.roundsPlayed === 1 ? 'round' : 'rounds'}</span>
                          </>
                        )}
                        {item.reason && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{item.reason}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Result Badge */}
                  <div>
                    {item.result === 'won' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Won</span>
                      </span>
                    )}
                    {item.result === 'lost' && (
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center gap-1">
                        <Swords className="w-3.5 h-3.5" />
                        <span>Lost</span>
                      </span>
                    )}
                    {item.result === 'draw' && (
                      <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Draw</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
