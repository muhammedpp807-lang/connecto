import { Chess, Square, Move } from 'chess.js';
import { ChessDifficulty, ChessPieceColor, ChessPieceType } from '../types';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Piece standard values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece-Square Tables (from White's perspective; inverted for Black)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
 50, 50, 50, 50, 50, 50, 50, 50,
 10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDGAME_TABLE = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

/**
 * Creates a chess instance initialized to a given FEN or start position
 */
export function createChessInstance(fen?: string): Chess {
  try {
    return new Chess(fen || INITIAL_FEN);
  } catch (err) {
    console.warn('Invalid FEN supplied, defaulting to initial position:', err);
    return new Chess();
  }
}

/**
 * Evaluates board position statically from White's perspective (+ is good for White, - is good for Black)
 */
export function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  let totalScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const pieceVal = PIECE_VALUES[piece.type] || 0;
      let positionalVal = 0;
      const squareIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

      switch (piece.type) {
        case 'p':
          positionalVal = PAWN_TABLE[squareIdx] || 0;
          break;
        case 'n':
          positionalVal = KNIGHT_TABLE[squareIdx] || 0;
          break;
        case 'b':
          positionalVal = BISHOP_TABLE[squareIdx] || 0;
          break;
        case 'r':
          positionalVal = ROOK_TABLE[squareIdx] || 0;
          break;
        case 'q':
          positionalVal = QUEEN_TABLE[squareIdx] || 0;
          break;
        case 'k':
          positionalVal = KING_MIDGAME_TABLE[squareIdx] || 0;
          break;
      }

      const pieceTotal = pieceVal + positionalVal;
      if (piece.color === 'w') {
        totalScore += pieceTotal;
      } else {
        totalScore -= pieceTotal;
      }
    }
  }

  // Bonus for check
  if (chess.inCheck()) {
    totalScore += chess.turn() === 'w' ? -50 : 50;
  }

  return totalScore;
}

/**
 * Order moves to improve alpha-beta pruning efficiency (captures and checks first)
 */
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.captured) {
      scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    }
    if (a.promotion) {
      scoreA += 800;
    }
    if (a.san.includes('+')) {
      scoreA += 50;
    }

    if (b.captured) {
      scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
    }
    if (b.promotion) {
      scoreB += 800;
    }
    if (b.san.includes('+')) {
      scoreB += 50;
    }

    return scoreB - scoreA;
  });
}

/**
 * Quiescence search to avoid the horizon effect on tactical captures
 */
function quiescence(chess: Chess, alpha: number, beta: number, depthLimit = 2): number {
  const standPat = evaluatePosition(chess);

  if (chess.turn() === 'w') {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  if (depthLimit <= 0) return standPat;

  const legalMoves = chess.moves({ verbose: true }) as Move[];
  const captureMoves = legalMoves.filter((m) => m.captured || m.promotion);
  const orderedCaptures = orderMoves(captureMoves);

  if (chess.turn() === 'w') {
    let maxEval = standPat;
    for (const move of orderedCaptures) {
      chess.move(move);
      const evaluation = quiescence(chess, alpha, beta, depthLimit - 1);
      chess.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = standPat;
    for (const move of orderedCaptures) {
      chess.move(move);
      const evaluation = quiescence(chess, alpha, beta, depthLimit - 1);
      chess.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Minimax algorithm with alpha-beta pruning
 */
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; bestMove: Move | null } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: quiescence(chess, alpha, beta, 2), bestMove: null };
  }

  const legalMoves = chess.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) {
    if (chess.isCheckmate()) {
      return { score: isMaximizing ? -99999 - depth : 99999 + depth, bestMove: null };
    }
    return { score: 0, bestMove: null }; // Draw / Stalemate
  }

  const ordered = orderMoves(legalMoves);
  let bestMove: Move | null = ordered[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();

      if (score > maxEval) {
        maxEval = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();

      if (score < minEval) {
        minEval = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, bestMove };
  }
}

/**
 * Calculates the best move for the Robot AI based on selected difficulty level
 */
export function calculateRobotMove(
  chess: Chess,
  difficulty: ChessDifficulty = 'medium'
): Move | null {
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) return null;

  const isMaximizing = chess.turn() === 'w';

  // 🟢 EASY Difficulty: Depth 1 with occasional slight randomness
  if (difficulty === 'easy') {
    // 75% choose best 1-ply move, 25% choose random legal move
    if (Math.random() < 0.25) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    const { bestMove } = minimax(chess, 1, -Infinity, Infinity, isMaximizing);
    return bestMove || legalMoves[0];
  }

  // 🟡 MEDIUM Difficulty: Depth 2 minimax with PST
  if (difficulty === 'medium') {
    const { bestMove } = minimax(chess, 2, -Infinity, Infinity, isMaximizing);
    return bestMove || legalMoves[0];
  }

  // 🔴 HARD Difficulty: Depth 3 with Alpha-Beta and Quiescence
  if (difficulty === 'hard') {
    const { bestMove } = minimax(chess, 3, -Infinity, Infinity, isMaximizing);
    return bestMove || legalMoves[0];
  }

  // 🟣 EXPERT Difficulty: Depth 4 search with tactical evaluation
  if (difficulty === 'expert') {
    const { bestMove } = minimax(chess, 4, -Infinity, Infinity, isMaximizing);
    return bestMove || legalMoves[0];
  }

  return legalMoves[0];
}

/**
 * Gets captured pieces for White and Black
 */
export function getCapturedPieces(chess: Chess): {
  whiteCaptured: ChessPieceType[]; // Pieces black lost (captured by white)
  blackCaptured: ChessPieceType[]; // Pieces white lost (captured by black)
  scoreAdvantage: number; // Positive means white is up, negative means black is up
} {
  const startingCounts: Record<ChessPieceType, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
    k: 1
  };

  const currentWhiteCounts: Record<ChessPieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlackCounts: Record<ChessPieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.color === 'w') {
        currentWhiteCounts[piece.type as ChessPieceType]++;
      } else {
        currentBlackCounts[piece.type as ChessPieceType]++;
      }
    }
  }

  const whiteCaptured: ChessPieceType[] = []; // Black pieces taken
  const blackCaptured: ChessPieceType[] = []; // White pieces taken

  (Object.keys(startingCounts) as ChessPieceType[]).forEach((type) => {
    if (type === 'k') return;
    const missingWhite = startingCounts[type] - (currentWhiteCounts[type] || 0);
    const missingBlack = startingCounts[type] - (currentBlackCounts[type] || 0);

    for (let i = 0; i < missingBlack; i++) {
      whiteCaptured.push(type);
    }
    for (let i = 0; i < missingWhite; i++) {
      blackCaptured.push(type);
    }
  });

  let whiteMaterial = 0;
  let blackMaterial = 0;
  (Object.keys(startingCounts) as ChessPieceType[]).forEach((type) => {
    const val = PIECE_VALUES[type] || 0;
    whiteMaterial += (currentWhiteCounts[type] || 0) * val;
    blackMaterial += (currentBlackCounts[type] || 0) * val;
  });

  const scoreAdvantage = Math.round((whiteMaterial - blackMaterial) / 100);

  return {
    whiteCaptured,
    blackCaptured,
    scoreAdvantage
  };
}
