import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Handshake, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  GameSession, 
  TicTacToeSymbol, 
  GameMode 
} from '../../types';
import { 
  evaluateBoard, 
  getBestRobotMove 
} from '../../services/tictactoeEngine';
import { 
  subscribeToGame, 
  executeGameMove, 
  requestGameRematch, 
  leaveGame, 
  saveGameHistory 
} from '../../services/gameService';
import { 
  playMoveSound, 
  playWinSound, 
  playDrawSound, 
  playLoseSound 
} from '../../utils/soundUtils';
import { Avatar } from '../common/Avatar';

// Crisp Vector SVG Game Piece for X
const SymbolX: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'preview' }> = ({
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-12 h-12 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    preview: 'w-10 h-10 sm:w-12 sm:h-12'
  }[size];

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <line
          x1="10"
          y1="10"
          x2="38"
          y2="38"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="38"
          y1="10"
          x2="10"
          y2="38"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Crisp Vector SVG Game Piece for O
const SymbolO: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' | 'preview' }> = ({
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-12 h-12 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    preview: 'w-10 h-10 sm:w-12 sm:h-12'
  }[size];

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <circle
          cx="24"
          cy="24"
          r="15"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

interface TicTacToeGameProps {
  gameId: string;
  initialSession: GameSession;
  onBackToGames: () => void;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({
  gameId,
  initialSession,
  onBackToGames
}) => {
  const { profile } = useAuth();
  const { colorConfig } = useTheme();
  const { settings, showToast } = useNotifications();

  const [game, setGame] = useState<GameSession>(initialSession);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(!settings.sounds);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const prevStatusRef = useRef(game.status);
  const robotTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to real-time game updates
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
      if (updatedGame) {
        setGame(updatedGame);
      }
    });

    return () => {
      unsubscribe();
      if (robotTimeoutRef.current) clearTimeout(robotTimeoutRef.current);
    };
  }, [gameId]);

  // Audio effect triggers on game state changes
  useEffect(() => {
    if (game.status !== prevStatusRef.current) {
      if (!isSoundMuted) {
        if (game.status === 'won') {
          const isMeWinner = game.winner === profile?.uid || (game.mode === 'robot' && game.winner === 'player1');
          if (isMeWinner) {
            playWinSound();
          } else {
            playLoseSound();
          }
        } else if (game.status === 'draw') {
          playDrawSound();
        }
      }

      // Record match history upon game completion
      if (game.status === 'won' || game.status === 'draw') {
        recordMatchHistory(game);
      }

      prevStatusRef.current = game.status;
    }
  }, [game.status, isSoundMuted, profile?.uid]);

  const recordMatchHistory = (current: GameSession) => {
    if (!profile) return;
    const isX = current.playerX === profile.uid || current.mode === 'offline';
    const playerSymbol: TicTacToeSymbol = isX ? 'X' : 'O';
    const isWinner = current.winner === profile.uid || (current.mode === 'robot' && current.winner === 'player1');
    const isDraw = current.status === 'draw';

    const opponentName = current.mode === 'robot'
      ? 'Robot AI'
      : current.mode === 'offline'
      ? `${current.playerOInfo?.displayName || 'Player 2'}`
      : current.playerX === profile.uid
      ? current.playerOInfo?.displayName || 'Friend'
      : current.playerXInfo?.displayName || 'Friend';

    const opponentAvatar = current.mode === 'online'
      ? (current.playerX === profile.uid ? current.playerOInfo?.photoURL : current.playerXInfo?.photoURL)
      : undefined;

    saveGameHistory(profile.uid, {
      gameType: 'tic-tac-toe',
      mode: current.mode,
      opponentName,
      opponentAvatar,
      result: isDraw ? 'draw' : isWinner ? 'won' : 'lost',
      playerSymbol,
      roundsPlayed: current.round || 1,
      playedAt: Date.now()
    });
  };

  // Robot AI Move Automation - Snappy and guaranteed execution
  useEffect(() => {
    if (
      game.mode === 'robot' &&
      game.status === 'active' &&
      game.currentTurn === 'robot'
    ) {
      setIsRobotThinking(true);
      
      const timer = setTimeout(async () => {
        try {
          const bestMove = getBestRobotMove(game.board, 'O', 'X');
          if (bestMove !== -1) {
            if (!isSoundMuted) playMoveSound();
            const updated = await executeGameMove(game.id, bestMove, 'robot', 'O');
            if (updated) setGame(updated);
          }
        } catch (err) {
          console.warn('Robot move error:', err);
        } finally {
          setIsRobotThinking(false);
        }
      }, 120);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [game.id, game.mode, game.status, game.currentTurn, game.board, isSoundMuted]);

  // Handle player clicking a board cell
  const handleCellClick = async (index: number) => {
    if (game.status !== 'active') return;
    if (game.board[index] !== '') return; // Occupied cell
    if (isRobotThinking) return;

    if (game.mode === 'robot') {
      if (game.currentSymbol !== 'X') return; // Not user's turn
      if (!isSoundMuted) playMoveSound();
      const playerXUid = game.playerX || 'player1';
      const updated = await executeGameMove(game.id, index, playerXUid, 'X');
      if (updated) setGame(updated);
    } else if (game.mode === 'offline') {
      const activeUid = game.currentTurn;
      const activeSymbol = game.currentSymbol;
      if (!isSoundMuted) playMoveSound();
      const updated = await executeGameMove(game.id, index, activeUid, activeSymbol);
      if (updated) setGame(updated);
    } else if (game.mode === 'online') {
      const myUid = profile?.uid || '';
      if (game.currentTurn !== myUid) return; // Not user's turn
      const mySymbol = game.playerX === myUid ? 'X' : 'O';
      if (!isSoundMuted) playMoveSound();
      const updated = await executeGameMove(game.id, index, myUid, mySymbol);
      if (updated) setGame(updated);
    }
  };

  // Handle Rematch Request
  const handleRematch = async () => {
    setRematchLoading(true);
    try {
      const playerUid = game.mode === 'online'
        ? (profile?.uid || 'player1')
        : 'player1';

      const updated = await requestGameRematch(game.id, playerUid);
      if (updated) {
        setGame(updated);
        if (updated.status === 'active') {
          showToast('success', `Round ${updated.round} started!`);
        }
      }
    } catch {
      showToast('error', 'Failed to start rematch.');
    } finally {
      setRematchLoading(false);
    }
  };

  const handleExit = async () => {
    if (game.mode === 'online' && profile) {
      await leaveGame(game.id, profile.uid);
    }
    onBackToGames();
  };

  // Determine current user's role & status
  const isOnline = game.mode === 'online';
  const myUid = profile?.uid || 'player1';
  const isMyTurn = isOnline
    ? game.currentTurn === myUid
    : game.mode === 'robot'
    ? game.currentTurn === 'player1'
    : true; // Offline is always active local device

  const pXName = game.playerXInfo?.displayName || (game.mode === 'robot' ? 'You' : 'Player 1');
  const pOName = game.playerOInfo?.displayName || (game.mode === 'robot' ? 'Robot AI' : 'Player 2');

  const pXAvatar = game.playerXInfo?.photoURL;
  const pOAvatar = game.playerOInfo?.photoURL;

  const mySymbol: TicTacToeSymbol = isOnline
    ? (game.playerX === myUid ? 'X' : 'O')
    : 'X';

  const currentHoverSymbol: TicTacToeSymbol = game.mode === 'offline' 
    ? game.currentSymbol 
    : isOnline 
    ? mySymbol 
    : 'X';

  const isWinner = isOnline
    ? game.winner === myUid
    : game.mode === 'robot'
    ? game.winner === 'player1'
    : null;

  const winnerName = game.winner === game.playerX
    ? pXName
    : game.winner === game.playerO
    ? pOName
    : null;

  const isRematchRequestedByMe = game.rematchAcceptedBy?.includes(myUid);
  const isWaitingForOpponent = isOnline && isRematchRequestedByMe && game.status !== 'active';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] dark:from-[#0b141a] dark:to-[#060a0d] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-4 select-none">
      {/* Top Bar Controls */}
      <div className="w-full max-w-lg flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-[#1f2c34]">
        <button
          type="button"
          onClick={handleExit}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111b21] hover:bg-slate-100 dark:hover:bg-[#19242b] border border-slate-200 dark:border-[#1f2c34] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Game</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full bg-slate-200/80 dark:bg-[#1f2c34] text-slate-700 dark:text-slate-300 text-xs font-black">
            Round {game.round || 1}
          </span>

          <button
            type="button"
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className="p-2 rounded-xl bg-white dark:bg-[#111b21] hover:bg-slate-100 dark:hover:bg-[#19242b] border border-slate-200 dark:border-[#1f2c34] text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-xs"
            title={isSoundMuted ? 'Unmute Game Sounds' : 'Mute Game Sounds'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
          </button>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="w-full max-w-md my-auto space-y-6 flex flex-col items-center">
        {/* Players Versus Match Card */}
        <div className="w-full p-4 rounded-3xl bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] shadow-lg flex items-center justify-between gap-4">
          {/* Player X */}
          <div className={`flex-1 flex flex-col items-center text-center p-2.5 rounded-2xl transition-all ${
            game.currentSymbol === 'X' && game.status === 'active'
              ? 'bg-indigo-50/90 dark:bg-indigo-950/50 ring-2 ring-indigo-500/60 shadow-sm'
              : 'opacity-75'
          }`}>
            <div className="relative">
              {game.mode === 'robot' ? (
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-200 dark:border-indigo-800">
                  👤
                </div>
              ) : (
                <Avatar src={pXAvatar} name={pXName} size="md" />
              )}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white dark:border-[#111b21] shadow-xs">
                X
              </span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white mt-2 truncate max-w-[100px]">
              {pXName}
            </p>
            <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
              Score: {game.scores?.playerX || 0}
            </span>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">VS</span>
            <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1f2c34] text-[10px] font-bold text-slate-500 mt-1">
              Draws: {game.scores?.draws || 0}
            </div>
          </div>

          {/* Player O */}
          <div className={`flex-1 flex flex-col items-center text-center p-2.5 rounded-2xl transition-all ${
            game.currentSymbol === 'O' && game.status === 'active'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 ring-2 ring-rose-500/60 shadow-sm'
              : 'opacity-75'
          }`}>
            <div className="relative">
              {game.mode === 'robot' ? (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl border border-rose-200 dark:border-rose-800">
                  🤖
                </div>
              ) : (
                <Avatar src={pOAvatar} name={pOName} size="md" />
              )}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white dark:border-[#111b21] shadow-xs">
                O
              </span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white mt-2 truncate max-w-[100px]">
              {pOName}
            </p>
            <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              Score: {game.scores?.playerO || 0}
            </span>
          </div>
        </div>

        {/* Real-Time Turn Indicator Banner */}
        <div className="w-full text-center min-h-[38px] flex items-center justify-center">
          {game.status === 'active' ? (
            isRobotThinking ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>🤖 Robot is thinking...</span>
              </div>
            ) : isOnline ? (
              isMyTurn ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Your Turn — Place your {mySymbol}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-slate-200/80 dark:bg-[#1f2c34] text-slate-600 dark:text-slate-400 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for {game.currentTurn === game.playerX ? pXName : pOName}...</span>
                </div>
              )
            ) : game.mode === 'robot' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Your Turn (X)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                <span>
                  {game.currentSymbol === 'X' ? `${pXName}'s Turn (X)` : `${pOName}'s Turn (O)`}
                </span>
              </div>
            )
          ) : null}
        </div>

        {/* 3x3 Tic-Tac-Toe Board */}
        <div 
          id="tictactoe-board"
          className="w-full max-w-[340px] sm:max-w-[360px] aspect-square p-3.5 rounded-3xl bg-white dark:bg-[#111b21] border-2 border-slate-200 dark:border-[#1f2c34] shadow-2xl grid grid-cols-3 gap-3 relative"
        >
          {game.board.map((cell, index) => {
            const isWinningCell = game.winningLine?.includes(index);
            const isFilled = cell !== '';
            const isCellDisabled = isFilled || game.status !== 'active' || isRobotThinking || (isOnline && !isMyTurn);
            const isHovered = hoveredCell === index && !isCellDisabled && !isFilled;

            return (
              <button
                key={index}
                id={`cell-${index}`}
                type="button"
                onClick={() => handleCellClick(index)}
                onMouseEnter={() => setHoveredCell(index)}
                onMouseLeave={() => setHoveredCell(null)}
                disabled={isCellDisabled}
                aria-label={`Cell ${index + 1} — ${isFilled ? cell : 'Empty'}`}
                className={`w-full h-full rounded-2xl flex items-center justify-center font-black transition-all duration-200 relative overflow-hidden select-none ${
                  isWinningCell
                    ? 'bg-amber-400/25 text-amber-500 ring-4 ring-amber-400 scale-105 z-10 animate-pulse shadow-lg'
                    : isFilled
                    ? 'bg-slate-100/90 dark:bg-[#19242b] cursor-default'
                    : isCellDisabled
                    ? 'bg-slate-50/50 dark:bg-[#151f26]/40 cursor-not-allowed'
                    : 'bg-slate-50 dark:bg-[#19242b] hover:bg-slate-100 dark:hover:bg-[#202c33] active:scale-95 cursor-pointer shadow-inner'
                }`}
              >
                {cell === 'X' && (
                  <div className="text-indigo-600 dark:text-indigo-400 animate-in zoom-in-75 duration-200">
                    <SymbolX size="md" />
                  </div>
                )}
                {cell === 'O' && (
                  <div className="text-rose-600 dark:text-rose-400 animate-in zoom-in-75 duration-200">
                    <SymbolO size="md" />
                  </div>
                )}
                {/* Ghost preview when hovering valid empty cell */}
                {isHovered && (
                  <div className={`opacity-30 scale-90 transition-transform ${
                    currentHoverSymbol === 'X' 
                      ? 'text-indigo-500 dark:text-indigo-400' 
                      : 'text-rose-500 dark:text-rose-400'
                  }`}>
                    {currentHoverSymbol === 'X' ? <SymbolX size="md" /> : <SymbolO size="md" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Game Result Modal / Overlay */}
        {game.status !== 'active' && (
          <div className="w-full p-6 rounded-3xl bg-white dark:bg-[#111b21] border-2 border-slate-200 dark:border-[#1f2c34] shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            {game.status === 'won' ? (
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center text-3xl">
                  🏆
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {game.mode === 'robot'
                    ? game.winner === 'player1'
                      ? '🎉 You Won!'
                      : '🤖 Robot Won!'
                    : isOnline
                    ? isWinner
                      ? '🎉 You Won!'
                      : `🏆 ${winnerName} Won!`
                    : `🏆 ${winnerName} Won!`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Awesome match! Ready for a rematch?
                </p>
              </div>
            ) : game.status === 'draw' ? (
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-indigo-500/15 text-indigo-500 mx-auto flex items-center justify-center text-3xl">
                  🤝
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  🤝 It's a Draw!
                </h3>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 font-semibold">
                  <span>⚡ <strong>Draw Starter Rule:</strong> The first turn in the next round will be given to the opponent!</span>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                id="btn-game-rematch"
                onClick={handleRematch}
                disabled={rematchLoading || isWaitingForOpponent}
                style={{ backgroundColor: colorConfig.primaryHex }}
                className="flex-1 py-3 px-4 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {rematchLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>
                  {isWaitingForOpponent
                    ? 'Waiting for opponent...'
                    : game.status === 'draw'
                    ? 'Start Next Round'
                    : '🔄 Rematch'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                🏠 Back to Games
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md text-center py-2 text-[11px] text-slate-400 dark:text-slate-500">
        {game.mode === 'robot' && 'Playing against Smart Minimax Robot'}
        {game.mode === 'offline' && 'Offline 2-Player Pass & Play mode'}
        {game.mode === 'online' && 'Real-time Multiplayer Match'}
      </div>
    </div>
  );
};

