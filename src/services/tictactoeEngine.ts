import { TicTacToeBoard, TicTacToeSymbol } from '../types';

export const WINNING_COMBINATIONS: number[][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6]
];

export interface GameEvaluation {
  winner: TicTacToeSymbol | null;
  winningLine: number[] | null;
  isDraw: boolean;
  isGameOver: boolean;
}

export function evaluateBoard(board: string[]): GameEvaluation {
  // Check winning lines
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as TicTacToeSymbol,
        winningLine: combo,
        isDraw: false,
        isGameOver: true
      };
    }
  }

  // Check if all cells filled
  const isFull = board.every((cell) => cell === 'X' || cell === 'O');
  if (isFull) {
    return {
      winner: null,
      winningLine: null,
      isDraw: true,
      isGameOver: true
    };
  }

  return {
    winner: null,
    winningLine: null,
    isDraw: false,
    isGameOver: false
  };
}

export function getAvailableMoves(board: string[]): number[] {
  const moves: number[] = [];
  board.forEach((cell, index) => {
    if (!cell || cell.trim() === '') {
      moves.push(index);
    }
  });
  return moves;
}

/**
 * Minimax AI for Tic-Tac-Toe
 * Calculates unbeatable optimal moves, blocking opponents and seizing victory.
 */
function minimax(
  currentBoard: string[],
  depth: number,
  isMaximizing: boolean,
  aiSymbol: TicTacToeSymbol,
  humanSymbol: TicTacToeSymbol
): { score: number; move?: number } {
  const evaluation = evaluateBoard(currentBoard);

  if (evaluation.winner === aiSymbol) {
    return { score: 10 - depth };
  }
  if (evaluation.winner === humanSymbol) {
    return { score: depth - 10 };
  }
  if (evaluation.isDraw) {
    return { score: 0 };
  }

  const availableMoves = getAvailableMoves(currentBoard);

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      currentBoard[move] = aiSymbol;
      const result = minimax(currentBoard, depth + 1, false, aiSymbol, humanSymbol);
      currentBoard[move] = '';

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
    }
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      currentBoard[move] = humanSymbol;
      const result = minimax(currentBoard, depth + 1, true, aiSymbol, humanSymbol);
      currentBoard[move] = '';

      if (result.score < bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
    }
    return { score: bestScore, move: bestMove };
  }
}

/**
 * Determines the best move for the Robot AI using Minimax + Strategic Prioritization
 */
export function getBestRobotMove(
  board: string[],
  robotSymbol: TicTacToeSymbol = 'O',
  humanSymbol: TicTacToeSymbol = 'X'
): number {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return -1;

  // 1. Quick check: If robot can win in 1 move, take it immediately
  for (const move of availableMoves) {
    const tempBoard = [...board];
    tempBoard[move] = robotSymbol;
    if (evaluateBoard(tempBoard).winner === robotSymbol) {
      return move;
    }
  }

  // 2. Quick check: If human can win in 1 move, block it immediately
  for (const move of availableMoves) {
    const tempBoard = [...board];
    tempBoard[move] = humanSymbol;
    if (evaluateBoard(tempBoard).winner === humanSymbol) {
      return move;
    }
  }

  // 3. If center (index 4) is free on first or second move, take center
  if (availableMoves.includes(4) && availableMoves.length >= 7) {
    return 4;
  }

  // 4. Run Minimax algorithm for optimal game tree evaluation
  const minimaxResult = minimax([...board], 0, true, robotSymbol, humanSymbol);
  if (minimaxResult.move !== undefined && availableMoves.includes(minimaxResult.move)) {
    return minimaxResult.move;
  }

  // Fallback: Corners then random available
  const corners = [0, 2, 6, 8].filter((c) => availableMoves.includes(c));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  return availableMoves[0];
}

/**
 * Calculates the starting player symbol for the next round.
 * SPECIAL RULE:
 * If the previous round was a DRAW, the starting player MUST alternate to the OPPONENT
 * of whoever started the previous round!
 */
export function getNextRoundStarter(
  previousStarterSymbol: TicTacToeSymbol,
  wasDraw: boolean
): TicTacToeSymbol {
  if (wasDraw) {
    // Alternate starter on draw
    return previousStarterSymbol === 'X' ? 'O' : 'X';
  }
  // Standard rematch can either keep or alternate; by default alternate or preserve based on setting
  return previousStarterSymbol === 'X' ? 'O' : 'X';
}
