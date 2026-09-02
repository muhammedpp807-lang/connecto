import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Flag, Handshake, Volume2, VolumeX, 
  Copy, Check, Bot, User, Sparkles, RefreshCw, ChevronLeft, 
  ChevronRight, Award, Trophy, Clock, AlertTriangle, Shield
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  GameSession, ChessPieceType, ChessPieceColor, 
  ChessMoveRecord, GamePlayerInfo, ChessDifficulty 
} from '../../../types';
import { ChessPiece } from './ChessPiece';
import { ChessPromotionModal } from './ChessPromotionModal';
import { 
  createChessInstance, INITIAL_FEN, calculateRobotMove, 
  getCapturedPieces 
} from '../../../services/chessEngine';
import { 
  executeChessMove, resignChessGame, offerChessDraw, 
  respondChessDrawOffer, timeoutChessGame, requestChessRematch, 
  subscribeToGame, saveGameHistory, leaveGame 
} from '../../../services/gameService';
import { Chess, Square, Move } from 'chess.js';

interface ChessGameProps {
  gameId: string;
  onExit: () => void;
}

// Audio synth utility for game effects
function playSound(type: 'move' | 'capture' | 'check' | 'gameover' | 'notify') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'check') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'gameover') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
      });
    }
  } catch {
    // Ignore audio context errors on muted browsers
  }
}

export const ChessGame: React.FC<ChessGameProps> = ({ gameId, onExit }) => {
  const { profile } = useAuth();
  const { colorConfig } = useTheme();

  const [game, setGame] = useState<GameSession | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isRobotThinking, setIsRobotThinking] = useState(false);

  // Promotion modal state
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Modals & confirmation
  const [showResignModal, setShowResignModal] = useState(false);
  const [showDrawConfirmModal, setShowDrawConfirmModal] = useState(false);
  const [copiedType, setCopiedType] = useState<'fen' | 'pgn' | null>(null);
  const [historySaved, setHistorySaved] = useState(false);

  // Drag and drop state
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);

  // Clock countdown state
  const [whiteTime, setWhiteTime] = useState<number | null>(null);
  const [blackTime, setBlackTime] = useState<number | null>(null);

  const currentUserId = profile?.uid || 'player1';

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
      if (updatedGame) {
        setGame(updatedGame);
        if (updatedGame.whiteTimeRemaining !== undefined) {
          setWhiteTime(updatedGame.whiteTimeRemaining);
        }
        if (updatedGame.blackTimeRemaining !== undefined) {
          setBlackTime(updatedGame.blackTimeRemaining);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  const chess = useMemo(() => {
    return createChessInstance(game?.fen || INITIAL_FEN);
  }, [game?.fen]);

  // Player role detection
  const whitePlayerId = game?.playerWhite || game?.playerX || 'player1';
  const blackPlayerId = game?.playerBlack || game?.playerO || 'player2';

  // In Robot mode: if white is not robot, human is white; if black is not robot, human is black
  const isUserWhite = useMemo(() => {
    if (game?.mode === 'robot') {
      return whitePlayerId !== 'robot';
    }
    return currentUserId === whitePlayerId;
  }, [game?.mode, whitePlayerId, currentUserId]);

  const isUserBlack = useMemo(() => {
    if (game?.mode === 'robot') {
      return blackPlayerId !== 'robot';
    }
    return currentUserId === blackPlayerId;
  }, [game?.mode, blackPlayerId, currentUserId]);

  // In online mode or robot mode: default board orientation follows player color (Black gets flipped)
  useEffect(() => {
    if (game?.mode === 'online') {
      setIsFlipped(isUserBlack);
    } else if (game?.mode === 'robot') {
      setIsFlipped(isUserBlack);
    }
  }, [game?.mode, isUserBlack]);

  const isMyTurn = useMemo(() => {
    if (!game || game.status !== 'active') return false;
    if (game.mode === 'offline') return true; // Single device
    if (game.mode === 'robot') return game.currentTurn !== 'robot';
    return game.currentTurn === currentUserId;
  }, [game, currentUserId]);

  const activeTurnColor = chess.turn(); // 'w' | 'b'

  // Clock timer interval handler
  useEffect(() => {
    if (!game || game.status !== 'active' || !game.isClockActive) return;

    const interval = setInterval(() => {
      if (activeTurnColor === 'w') {
        setWhiteTime((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            // Handle white timeout
            if (isMyTurn) timeoutChessGame(game.id, whitePlayerId);
            return 0;
          }
          return Math.max(0, prev - 1000);
        });
      } else {
        setBlackTime((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            // Handle black timeout
            if (isMyTurn) timeoutChessGame(game.id, blackPlayerId);
            return 0;
          }
          return Math.max(0, prev - 1000);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.status, game?.isClockActive, activeTurnColor, game?.id, isMyTurn, whitePlayerId, blackPlayerId]);

  // Audio feedback on new moves
  const lastMoveCount = useRef(game?.chessMoveHistory?.length || 0);
  useEffect(() => {
    const currentCount = game?.chessMoveHistory?.length || 0;
    if (currentCount > lastMoveCount.current) {
      const lastMove = game?.chessMoveHistory?.[currentCount - 1];
      if (isSoundEnabled && lastMove) {
        if (game.status === 'won' || game.status === 'draw') {
          playSound('gameover');
        } else if (game.isCheck) {
          playSound('check');
        } else if (lastMove.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }
      }
    }
    lastMoveCount.current = currentCount;
  }, [game?.chessMoveHistory?.length, game?.status, game?.isCheck, isSoundEnabled]);

  // Robot AI automated turn execution
  useEffect(() => {
    if (!game || game.status !== 'active' || game.mode !== 'robot') return;

    const isRobotTurn = game.currentTurn === 'robot';
    if (!isRobotTurn || isRobotThinking) return;

    setIsRobotThinking(true);

    const thinkingTimeout = setTimeout(async () => {
      try {
        const chessCopy = createChessInstance(game.fen);
        const bestMove = calculateRobotMove(chessCopy, game.chessDifficulty || 'medium');

        if (bestMove) {
          await executeChessMove(
            game.id,
            bestMove.from,
            bestMove.to,
            bestMove.promotion,
            'robot'
          );
        }
      } catch (err) {
        console.error('Robot move calculation failed:', err);
      } finally {
        setIsRobotThinking(false);
      }
    }, 450);

    return () => clearTimeout(thinkingTimeout);
  }, [game?.currentTurn, game?.status, game?.mode, game?.fen, game?.chessDifficulty, game?.id, isRobotThinking]);

  // Save game to history when completed
  useEffect(() => {
    if (!game || (game.status !== 'won' && game.status !== 'draw') || historySaved) return;

    const isOnlineOrRobot = game.mode === 'online' || game.mode === 'robot';
    if (!isOnlineOrRobot || !profile) return;

    const isWin = game.winner === profile.uid;
    const isLoss = game.status === 'won' && game.winner !== profile.uid;
    const result = isWin ? 'won' : isLoss ? 'lost' : 'draw';

    const opponentInfo = profile.uid === whitePlayerId ? game.playerBlackInfo : game.playerWhiteInfo;
    const playerColor = profile.uid === whitePlayerId ? 'White' : 'Black';

    saveGameHistory(profile.uid, {
      gameType: 'chess',
      mode: game.mode,
      opponentName: opponentInfo?.displayName || (game.mode === 'robot' ? 'Robot AI' : 'Opponent'),
      opponentAvatar: opponentInfo?.photoURL,
      result,
      playerColor,
      movesCount: game.chessMoveHistory?.length || 0,
      reason: game.winReason || game.drawReason || 'finished',
      playedAt: Date.now()
    });

    setHistorySaved(true);
  }, [game?.status, game?.winner, historySaved, profile, whitePlayerId, game]);

  // Core move execution logic (used by both click-to-move and drag-and-drop)
  const tryExecuteMove = useCallback(
    async (from: Square, to: Square) => {
      if (!game || game.status !== 'active') return false;
      if (isRobotThinking) return false;
      if (game.mode === 'online' && !isMyTurn) return false;

      // Find if this is a legal move from chess instance
      const moves = chess.moves({ square: from, verbose: true }) as Move[];
      const targetMove = moves.find((m) => m.to === to);

      if (!targetMove) return false;

      // Check for Pawn Promotion (White reaches rank 8 or Black reaches rank 1)
      const piece = chess.get(from);
      const isPawnPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        return true;
      }

      // Clear selection state
      setSelectedSquare(null);
      setValidMoves([]);

      const movingPlayerId =
        game.mode === 'offline'
          ? activeTurnColor === 'w'
            ? whitePlayerId
            : blackPlayerId
          : game.mode === 'robot'
          ? game.currentTurn
          : currentUserId;

      await executeChessMove(game.id, from, to, undefined, movingPlayerId);
      return true;
    },
    [game, isRobotThinking, isMyTurn, chess, activeTurnColor, whitePlayerId, blackPlayerId, currentUserId]
  );

  // Calculate legal moves for selected piece or attempt move
  const handleSquareClick = useCallback(
    async (square: Square) => {
      if (!game || game.status !== 'active') return;
      if (isRobotThinking) return;

      // In online mode: only allow interacting on your own turn and your own pieces
      if (game.mode === 'online' && !isMyTurn) return;

      const pieceOnSquare = chess.get(square);
      const isPlayerTurnColor = pieceOnSquare?.color === activeTurnColor;

      // If a piece is already selected, check if clicked square is a valid target
      if (selectedSquare) {
        // If clicking the same square, deselect
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }

        // Try executing move from selected square to clicked square
        const moved = await tryExecuteMove(selectedSquare, square);
        if (moved) return;

        // If clicked another own piece, select that piece instead
        if (isPlayerTurnColor) {
          if (game.mode === 'online') {
            const isMyPiece =
              (isUserWhite && pieceOnSquare.color === 'w') ||
              (isUserBlack && pieceOnSquare.color === 'b');
            if (!isMyPiece) return;
          }

          setSelectedSquare(square);
          const moves = chess.moves({ square, verbose: true }) as Move[];
          setValidMoves(moves);
          return;
        }

        // Clicked invalid empty/opponent square -> deselect
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // No piece selected yet: Select if it's a valid piece for current turn
      if (pieceOnSquare && isPlayerTurnColor) {
        if (game.mode === 'online') {
          const isMyPiece =
            (isUserWhite && pieceOnSquare.color === 'w') ||
            (isUserBlack && pieceOnSquare.color === 'b');
          if (!isMyPiece) return;
        }

        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true }) as Move[];
        setValidMoves(moves);
      }
    },
    [
      game,
      isRobotThinking,
      isMyTurn,
      chess,
      activeTurnColor,
      selectedSquare,
      tryExecuteMove,
      isUserWhite,
      isUserBlack
    ]
  );

  // Promotion choice selection
  const handlePromotionSelect = async (pieceType: ChessPieceType) => {
    if (!pendingPromotion || !game) return;

    const { from, to } = pendingPromotion;
    setPendingPromotion(null);

    const movingPlayerId =
      game.mode === 'offline'
        ? activeTurnColor === 'w'
          ? whitePlayerId
          : blackPlayerId
        : game.mode === 'robot'
        ? game.currentTurn
        : currentUserId;

    await executeChessMove(game.id, from, to, pieceType, movingPlayerId);
  };

  // Resignation action
  const handleResign = async () => {
    if (!game) return;
    setShowResignModal(false);
    await resignChessGame(game.id, currentUserId);
  };

  // Draw offer action
  const handleOfferDraw = async () => {
    if (!game) return;
    if (game.mode === 'offline' || game.mode === 'robot') {
      // In offline/robot mode, draw offer acts immediately
      await respondChessDrawOffer(game.id, true);
    } else {
      await offerChessDraw(game.id, currentUserId);
    }
  };

  // Rematch action
  const handleRematch = async () => {
    if (!game) return;
    setHistorySaved(false);
    await requestChessRematch(game.id, currentUserId);
  };

  // Undo move (available in offline or robot mode)
  const handleUndoMove = async () => {
    if (!game || game.status !== 'active') return;
    if (game.mode === 'online') return; // Not allowed directly in online mode

    const history = game.chessMoveHistory || [];
    if (history.length === 0) return;

    // In robot mode: undo 2 moves (player move + robot move) so it's player's turn again
    const undoCount = game.mode === 'robot' && history.length >= 2 ? 2 : 1;
    const targetHistory = history.slice(0, history.length - undoCount);

    const newChess = new Chess();
    targetHistory.forEach((m) => {
      newChess.move({ from: m.from, to: m.to, promotion: m.promotion as any });
    });

    const nextTurnColor = newChess.turn();
    const nextTurnId = nextTurnColor === 'w' ? whitePlayerId : blackPlayerId;

    const updatedGame: GameSession = {
      ...game,
      fen: newChess.fen(),
      pgn: newChess.pgn(),
      chessMoveHistory: targetHistory,
      currentTurn: nextTurnId,
      isCheck: newChess.inCheck(),
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: null,
      status: 'active',
      updatedAt: Date.now()
    };

    setGame(updatedGame);
  };

  // Copy PGN / FEN
  const handleCopy = (text: string, type: 'fen' | 'pgn') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Format timer countdown
  const formatTime = (ms: number | null) => {
    if (ms === null) return '--:--';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Captured pieces and material calculation
  const { whiteCaptured, blackCaptured, scoreAdvantage } = useMemo(() => {
    return getCapturedPieces(chess);
  }, [chess]);

  // Highlight information
  const lastMove = game?.chessMoveHistory?.[(game.chessMoveHistory?.length || 0) - 1];
  const kingInCheckSquare = useMemo(() => {
    if (!game?.isCheck) return null;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === activeTurnColor) {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = 8 - r;
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [game?.isCheck, chess, activeTurnColor]);

  // Board square rendering array
  const ranks = isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = isFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  const whitePlayerInfo = game?.playerWhiteInfo || { displayName: 'White', uid: whitePlayerId };
  const blackPlayerInfo = game?.playerBlackInfo || { displayName: 'Black', uid: blackPlayerId };

  const topPlayer = isFlipped ? whitePlayerInfo : blackPlayerInfo;
  const bottomPlayer = isFlipped ? blackPlayerInfo : whitePlayerInfo;
  const topColor: ChessPieceColor = isFlipped ? 'w' : 'b';
  const bottomColor: ChessPieceColor = isFlipped ? 'b' : 'w';
  const topTime = isFlipped ? whiteTime : blackTime;
  const bottomTime = isFlipped ? blackTime : whiteTime;

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-sm font-bold text-slate-500">Loading Chess match...</p>
        </div>
      </div>
    );
  }

  const isGameOver = game.status === 'won' || game.status === 'draw';

  return (
    <div className="flex-1 flex flex-col h-full max-w-7xl mx-auto w-full px-2 sm:px-6 py-2 sm:py-4 overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1f2c34] mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Games</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">♟️</span>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                {game.mode === 'robot'
                  ? `Robot Chess (${game.chessDifficulty?.toUpperCase() || 'MEDIUM'})`
                  : game.mode === 'offline'
                  ? 'Pass & Play Chess'
                  : 'Online Live Chess'}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Round {game.round || 1} • {activeTurnColor === 'w' ? '♔ White to move' : '♚ Black to move'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            title="Flip Board"
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title={isSoundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {game.mode !== 'online' && (
            <button
              type="button"
              onClick={handleUndoMove}
              disabled={isGameOver || (game.chessMoveHistory?.length || 0) === 0}
              title="Undo Move"
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-600 dark:text-slate-300 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          {!isGameOver && (
            <button
              type="button"
              onClick={() => setShowResignModal(true)}
              title="Resign Game"
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition cursor-pointer flex items-center gap-1 text-xs font-bold border border-rose-200 dark:border-rose-900/40"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Resign</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Board & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 items-start">
        {/* Left/Center Column: Chessboard & Players */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center">
          {/* Top Player Card */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-[#19242b] rounded-2xl mb-2 border border-slate-200/80 dark:border-[#2a3942]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {topPlayer.photoURL ? (
                  <img
                    src={topPlayer.photoURL}
                    alt={topPlayer.displayName}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-[#2a3942]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-[#202c33] flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                    {topColor === 'w' ? '♔' : '♚'}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {topColor === 'w' ? '⚪' : '⚫'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {topPlayer.displayName}
                  </span>
                  {game.mode === 'robot' && topPlayer.uid === 'robot' && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                      AI
                    </span>
                  )}
                </div>

                {/* Captured pieces tray */}
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                  {(topColor === 'w' ? whiteCaptured : blackCaptured).map((type, idx) => (
                    <span key={idx} className="text-xs opacity-80 leading-none">
                      {type === 'p' ? '♟' : type === 'n' ? '♞' : type === 'b' ? '♝' : type === 'r' ? '♜' : '♛'}
                    </span>
                  ))}
                  {((topColor === 'w' && scoreAdvantage > 0) || (topColor === 'b' && scoreAdvantage < 0)) && (
                    <span className="text-[10px] font-black text-slate-500 ml-1">
                      +{Math.abs(scoreAdvantage)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Player Clock & Status */}
            <div className="flex items-center gap-2">
              {activeTurnColor === topColor && !isGameOver && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-black animate-pulse">
                  {isRobotThinking && topPlayer.uid === 'robot' ? 'Thinking...' : 'To Move'}
                </span>
              )}

              {game.isClockActive && (
                <div
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-xs transition-colors ${
                    activeTurnColor === topColor && !isGameOver
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-[#202c33] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(topTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 8x8 Chessboard Grid */}
          <div className="relative w-full max-w-[540px] aspect-square select-none rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-300 dark:border-[#2a3942] bg-slate-900">
            <div className="w-full h-full grid grid-rows-8 grid-cols-8">
              {ranks.map((rank, rIdx) =>
                files.map((file, fIdx) => {
                  const square = `${file}${rank}` as Square;
                  const isLight = (rank + file.charCodeAt(0)) % 2 === 0;
                  const piece = chess.get(square);

                  const isSelected = selectedSquare === square;
                  const isDestination = validMoves.some((m) => m.to === square);
                  const isCapture = isDestination && !!piece;
                  const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
                  const isKingInCheck = kingInCheckSquare === square;

                  // Coordinates labels
                  const showFileLabel = rIdx === 7;
                  const showRankLabel = fIdx === 0;

                  return (
                    <div
                      key={square}
                      id={`chess-sq-${square}`}
                      onClick={() => handleSquareClick(square)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (draggedSquare && draggedSquare !== square) {
                          await tryExecuteMove(draggedSquare, square);
                        }
                        setDraggedSquare(null);
                      }}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 ${
                        isLight
                          ? isLastMoveSquare
                            ? 'bg-[#CED26B] dark:bg-[#B58863]/60'
                            : 'bg-[#F0D9B5] text-[#B58863]'
                          : isLastMoveSquare
                          ? 'bg-[#AAA23A] dark:bg-[#8B5A2B]/80'
                          : 'bg-[#B58863] text-[#F0D9B5]'
                      } ${
                        isSelected
                          ? 'ring-4 ring-inset ring-amber-400 bg-amber-200/80 dark:bg-amber-600/70 z-10'
                          : ''
                      } ${
                        isKingInCheck
                          ? 'ring-4 ring-inset ring-rose-600 bg-rose-500/50 animate-pulse z-10'
                          : ''
                      }`}
                    >
                      {/* Rank & File Coordinate Labels */}
                      {showRankLabel && (
                        <span
                          className={`absolute top-0.5 left-1 text-[9px] font-black pointer-events-none select-none ${
                            isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'
                          }`}
                        >
                          {rank}
                        </span>
                      )}
                      {showFileLabel && (
                        <span
                          className={`absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none select-none ${
                            isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'
                          }`}
                        >
                          {file}
                        </span>
                      )}

                      {/* Move Destination Markers */}
                      {isDestination && !isCapture && (
                        <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/30 dark:bg-white/40 pointer-events-none z-20 animate-in zoom-in-50 duration-100" />
                      )}

                      {isCapture && (
                        <div className="absolute inset-0 ring-4 ring-inset ring-rose-500/80 rounded-sm pointer-events-none z-20 animate-in zoom-in-75 duration-100" />
                      )}

                      {/* Chess Piece Display */}
                      {piece && (
                        <div
                          draggable={!isGameOver && isMyTurn}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', square);
                            setDraggedSquare(square);
                            handleSquareClick(square);
                          }}
                          onDragEnd={() => {
                            setDraggedSquare(null);
                          }}
                          className="w-full h-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10"
                        >
                          <ChessPiece
                            type={piece.type as ChessPieceType}
                            color={piece.color as ChessPieceColor}
                            size={undefined}
                            className="w-[82%] h-[82%]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Check overlay alert badge */}
            {game.isCheck && !isGameOver && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-1 rounded-full bg-rose-600 text-white font-black text-xs tracking-wider shadow-lg flex items-center gap-1.5 animate-bounce">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>⚠️ CHECK!</span>
              </div>
            )}
          </div>

          {/* Bottom Player Card */}
          <div className="w-full max-w-[540px] flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-[#19242b] rounded-2xl mt-2 border border-slate-200/80 dark:border-[#2a3942]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {bottomPlayer.photoURL ? (
                  <img
                    src={bottomPlayer.photoURL}
                    alt={bottomPlayer.displayName}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-[#2a3942]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-[#202c33] flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                    {bottomColor === 'w' ? '♔' : '♚'}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {bottomColor === 'w' ? '⚪' : '⚫'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {bottomPlayer.displayName}
                  </span>
                  {bottomPlayer.uid === currentUserId && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>

                {/* Captured pieces tray */}
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                  {(bottomColor === 'w' ? whiteCaptured : blackCaptured).map((type, idx) => (
                    <span key={idx} className="text-xs opacity-80 leading-none">
                      {type === 'p' ? '♟' : type === 'n' ? '♞' : type === 'b' ? '♝' : type === 'r' ? '♜' : '♛'}
                    </span>
                  ))}
                  {((bottomColor === 'w' && scoreAdvantage > 0) || (bottomColor === 'b' && scoreAdvantage < 0)) && (
                    <span className="text-[10px] font-black text-slate-500 ml-1">
                      +{Math.abs(scoreAdvantage)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Player Clock & Status */}
            <div className="flex items-center gap-2">
              {activeTurnColor === bottomColor && !isGameOver && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-black animate-pulse">
                  To Move
                </span>
              )}

              {game.isClockActive && (
                <div
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-xs transition-colors ${
                    activeTurnColor === bottomColor && !isGameOver
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-[#202c33] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(bottomTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Move History, Status & Game Actions */}
        <div className="lg:col-span-4 flex flex-col gap-3 w-full">
          {/* Score & Turn Banner */}
          <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-[#1f2c34]">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Match Score</span>
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="text-slate-700 dark:text-slate-300">
                  ♔ {game.scores?.playerX || 0}
                </span>
                <span className="text-slate-400">-</span>
                <span className="text-slate-700 dark:text-slate-300">
                  ♚ {game.scores?.playerO || 0}
                </span>
                {(game.scores?.draws || 0) > 0 && (
                  <span className="text-slate-400 text-[11px]">({game.scores?.draws} draws)</span>
                )}
              </div>
            </div>

            {/* Current Game State */}
            {!isGameOver ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isMyTurn ? '🎯 Your Turn' : "⏳ Opponent's Turn"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeTurnColor === 'w' ? 'White to move' : 'Black to move'}
                    {isRobotThinking && ' (Robot AI thinking...)'}
                  </p>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isMyTurn ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="inline-flex p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-2">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {game.status === 'draw'
                    ? '🤝 DRAW'
                    : game.winner === whitePlayerId
                    ? '🏆 WHITE WINS!'
                    : '🏆 BLACK WINS!'}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Reason: {game.winReason || game.drawReason || 'Game completed'}
                </p>
              </div>
            )}
          </div>

          {/* Move History Table */}
          <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-2xl p-4 shadow-sm flex flex-col h-64 sm:h-72">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Move History ({game.chessMoveHistory?.length || 0})
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(game.fen || INITIAL_FEN, 'fen')}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-[10px] font-bold text-slate-600 dark:text-slate-400 transition cursor-pointer flex items-center gap-1"
                >
                  {copiedType === 'fen' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>FEN</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(game.pgn || '', 'pgn')}
                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-[10px] font-bold text-slate-600 dark:text-slate-400 transition cursor-pointer flex items-center gap-1"
                >
                  {copiedType === 'pgn' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>PGN</span>
                </button>
              </div>
            </div>

            {/* Move List Scrollable */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 font-mono text-xs">
              {(() => {
                const history = game.chessMoveHistory || [];
                if (history.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                      Moves will appear here
                    </div>
                  );
                }

                const rows: { num: number; white: ChessMoveRecord; black?: ChessMoveRecord }[] = [];
                for (let i = 0; i < history.length; i += 2) {
                  rows.push({
                    num: Math.floor(i / 2) + 1,
                    white: history[i],
                    black: history[i + 1]
                  });
                }

                return rows.map((row) => (
                  <div
                    key={row.num}
                    className="grid grid-cols-12 py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#19242b] text-slate-700 dark:text-slate-300"
                  >
                    <span className="col-span-3 text-slate-400 font-bold">{row.num}.</span>
                    <span className="col-span-4 font-bold text-slate-900 dark:text-white">
                      {row.white.san}
                    </span>
                    <span className="col-span-5 font-bold text-slate-900 dark:text-white">
                      {row.black ? row.black.san : ''}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Action Buttons & Draw / Rematch Controls */}
          <div className="space-y-2">
            {!isGameOver ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOfferDraw}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-[#2a3942]"
                >
                  <Handshake className="w-4 h-4 text-amber-500" />
                  <span>Offer Draw</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResignModal(true)}
                  className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200 dark:border-rose-900/40"
                >
                  <Flag className="w-4 h-4" />
                  <span>Resign</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRematch}
                  style={{ backgroundColor: colorConfig.primaryHex }}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-98 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {game.rematchRequestedBy
                      ? game.rematchRequestedBy === currentUserId
                        ? 'Waiting for Opponent...'
                        : 'Accept Rematch ⚔️'
                      : 'Request Rematch'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-slate-200 dark:hover:bg-[#2a3942] text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Back to Games Hub
                </button>
              </div>
            )}

            {/* Incoming Draw Offer Notification Banner */}
            {game.drawOfferFrom && game.drawOfferFrom !== currentUserId && !isGameOver && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl animate-in zoom-in-95">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">
                  🤝 Opponent offered a draw. Accept?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondChessDrawOffer(game.id, true)}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black"
                  >
                    Accept Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => respondChessDrawOffer(game.id, false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-[#202c33] text-slate-700 dark:text-slate-300 text-xs font-bold"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pawn Promotion Selection Modal */}
      <ChessPromotionModal
        isOpen={!!pendingPromotion}
        color={activeTurnColor}
        onSelectPiece={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />

      {/* Resignation Confirmation Modal */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-[#1f2c34] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Flag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              Resign Game?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Are you sure you want to resign? Your opponent will win immediately.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowResignModal(false)}
                className="py-2.5 rounded-xl bg-slate-100 dark:bg-[#1f2c34] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResign}
                className="py-2.5 rounded-xl bg-rose-600 text-xs font-black text-white hover:bg-rose-700 shadow-md"
              >
                Confirm Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
