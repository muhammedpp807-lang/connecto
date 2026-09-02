import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { 
  GameSession, 
  GameInvitation, 
  GameHistoryItem, 
  UserProfile, 
  GameType, 
  GameMode, 
  GameStatus,
  TicTacToeSymbol,
  ChessDifficulty,
  ChessMoveRecord
} from '../types';
import { evaluateBoard, getNextRoundStarter } from './tictactoeEngine';
import { createChessInstance, INITIAL_FEN, calculateRobotMove } from './chessEngine';
import { safeGetItem, safeSetItem, isFirestoreQuotaExhausted, handleFirestoreError } from './storageEngine';

const LOCAL_GAMES_KEY = 'connecto_db_games';
const LOCAL_INVITATIONS_KEY = 'connecto_db_invitations';
const LOCAL_HISTORY_PREFIX = 'connecto_db_history_';

// BroadcastChannel for instant multi-tab sync across the same machine/browser
const gameChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('connecto_game_channel')
  : null;

// In-memory active game cache
const localGamesMap = new Map<string, GameSession>();
const localInvitationsMap = new Map<string, GameInvitation>();

// Initialize memory cache from localStorage
if (typeof window !== 'undefined') {
  try {
    const rawGames = safeGetItem<Record<string, GameSession>>(LOCAL_GAMES_KEY);
    if (rawGames && typeof rawGames === 'object') {
      Object.entries(rawGames).forEach(([k, v]) => localGamesMap.set(k, v));
    }
    const rawInvs = safeGetItem<Record<string, GameInvitation>>(LOCAL_INVITATIONS_KEY);
    if (rawInvs && typeof rawInvs === 'object') {
      Object.entries(rawInvs).forEach(([k, v]) => localInvitationsMap.set(k, v));
    }
  } catch (err) {
    console.warn('Game storage init note:', err);
  }
}

function persistLocalGames() {
  const obj: Record<string, GameSession> = {};
  localGamesMap.forEach((val, key) => { obj[key] = val; });
  safeSetItem(LOCAL_GAMES_KEY, obj);
}

function persistLocalInvitations() {
  const obj: Record<string, GameInvitation> = {};
  localInvitationsMap.forEach((val, key) => { obj[key] = val; });
  safeSetItem(LOCAL_INVITATIONS_KEY, obj);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Creates and sends a real-time game invitation
 */
export async function sendGameInvitation(
  senderOrType: UserProfile | GameType,
  receiverOrSender: UserProfile,
  typeOrReceiver?: GameType | UserProfile
): Promise<GameInvitation> {
  let sender: UserProfile;
  let receiver: UserProfile;
  let gameType: GameType = 'tic-tac-toe';

  // Support both (sender, receiver, gameType) and (gameType, sender, receiver) signatures
  if (typeof senderOrType === 'object' && senderOrType !== null && 'uid' in senderOrType) {
    sender = senderOrType as UserProfile;
    receiver = receiverOrSender as UserProfile;
    if (typeof typeOrReceiver === 'string') {
      gameType = typeOrReceiver as GameType;
    }
  } else {
    gameType = (senderOrType as GameType) || 'tic-tac-toe';
    sender = receiverOrSender as UserProfile;
    receiver = typeOrReceiver as UserProfile;
  }

  if (!sender?.uid || !receiver?.uid) {
    throw new Error('Invalid sender or receiver for game invitation.');
  }

  const invitationId = generateId('inv');
  const gameId = generateId('game');
  const now = Date.now();
  const expiresAt = now + 60000; // 60 seconds expiration

  const invitation: GameInvitation = {
    id: invitationId,
    gameType,
    gameId,
    senderId: sender.uid,
    senderName: sender.displayName || sender.username || 'Friend',
    senderAvatar: sender.photoURL,
    senderUsername: sender.username,
    receiverId: receiver.uid,
    receiverName: receiver.displayName || receiver.username || 'Friend',
    status: 'pending',
    createdAt: now,
    expiresAt
  };

  // Pre-initialize initial GameSession
  const initialGame: GameSession = {
    id: gameId,
    gameType,
    mode: 'online',
    playerX: sender.uid,
    playerO: receiver.uid,
    playerWhite: sender.uid,
    playerBlack: receiver.uid,
    playerXInfo: {
      uid: sender.uid,
      displayName: sender.displayName,
      photoURL: sender.photoURL,
      username: sender.username
    },
    playerOInfo: {
      uid: receiver.uid,
      displayName: receiver.displayName,
      photoURL: receiver.photoURL,
      username: receiver.username
    },
    playerWhiteInfo: {
      uid: sender.uid,
      displayName: sender.displayName,
      photoURL: sender.photoURL,
      username: sender.username
    },
    playerBlackInfo: {
      uid: receiver.uid,
      displayName: receiver.displayName,
      photoURL: receiver.photoURL,
      username: receiver.username
    },
    board: gameType === 'chess' ? [] : ['', '', '', '', '', '', '', '', ''],
    fen: gameType === 'chess' ? INITIAL_FEN : undefined,
    pgn: gameType === 'chess' ? '' : undefined,
    chessMoveHistory: [],
    timerInitialMinutes: 10,
    whiteTimeRemaining: 10 * 60 * 1000,
    blackTimeRemaining: 10 * 60 * 1000,
    isClockActive: true,
    lastMoveTimestamp: now,
    currentTurn: sender.uid, // White goes first
    currentSymbol: 'X',
    starter: sender.uid,
    starterSymbol: 'X',
    round: 1,
    status: 'waiting',
    winner: null,
    winningLine: null,
    scores: {
      playerX: 0,
      playerO: 0,
      draws: 0
    },
    rematchAcceptedBy: [],
    createdAt: now,
    updatedAt: now
  };

  // Save to local cache
  localInvitationsMap.set(invitationId, invitation);
  localGamesMap.set(gameId, initialGame);
  persistLocalInvitations();
  persistLocalGames();

  // Broadcast to other tabs
  gameChannel?.postMessage({ type: 'INVITATION_SENT', invitation, game: initialGame });

  // Save to Firestore if connected
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await setDoc(doc(db, 'game_invitations', invitationId), invitation);
      await setDoc(doc(db, 'games', gameId), initialGame);
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore game invite save note:', err);
    }
  }

  return invitation;
}

/**
 * Checks for existing active pending invitation between users
 */
export function getPendingInvitationBetween(senderId: string, receiverId: string): GameInvitation | null {
  const now = Date.now();
  for (const inv of localInvitationsMap.values()) {
    if (
      inv.status === 'pending' &&
      inv.expiresAt > now &&
      ((inv.senderId === senderId && inv.receiverId === receiverId) ||
       (inv.senderId === receiverId && inv.receiverId === senderId))
    ) {
      return inv;
    }
  }
  return null;
}

/**
 * Checks if a user is currently inside an active game (only active ongoing matches)
 */
export function isUserInActiveGame(userId: string): boolean {
  for (const game of localGamesMap.values()) {
    if (
      game.status === 'active' &&
      (game.playerX === userId || game.playerO === userId) &&
      Date.now() - game.updatedAt < 90000 // Active within last 90s
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Gets a game session by ID from local cache or Firestore
 */
export async function getGameSession(gameId: string): Promise<GameSession | null> {
  let session = localGamesMap.get(gameId);
  if (!session && isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'games', gameId));
      if (snap.exists()) {
        session = snap.data() as GameSession;
        localGamesMap.set(gameId, session);
        persistLocalGames();
      }
    } catch {}
  }
  return session || null;
}

/**
 * Subscribes to real-time invitations for a specific user (incoming + outgoing)
 */
export function subscribeToGameInvitations(
  userId: string,
  callback: (invitations: GameInvitation[]) => void
): () => void {
  const notify = () => {
    const now = Date.now();
    const list: GameInvitation[] = [];
    localInvitationsMap.forEach((inv) => {
      // Auto-expire pending invitations older than expiresAt
      if (inv.status === 'pending' && inv.expiresAt <= now) {
        inv.status = 'expired';
      }
      if (inv.receiverId === userId || inv.senderId === userId) {
        list.push({ ...inv });
      }
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  };

  // Immediate notification from local memory
  notify();

  // Listen to broadcast channel
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'INVITATION_SENT' || event.data?.type === 'INVITATION_UPDATED') {
      const inv = event.data.invitation as GameInvitation;
      if (inv) {
        localInvitationsMap.set(inv.id, inv);
        persistLocalInvitations();
      }
      const g = event.data.game as GameSession;
      if (g) {
        localGamesMap.set(g.id, g);
        persistLocalGames();
      }
      notify();
    }
  };

  gameChannel?.addEventListener('message', handleBroadcast);

  // Firestore listener
  let unsubFirestore1: Unsubscribe | null = null;
  let unsubFirestore2: Unsubscribe | null = null;

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const qRecv = query(
        collection(db, 'game_invitations'),
        where('receiverId', '==', userId)
      );
      unsubFirestore1 = onSnapshot(qRecv, (snap) => {
        snap.docs.forEach((d) => {
          const data = d.data() as GameInvitation;
          if (data && data.id) {
            localInvitationsMap.set(data.id, data);
          }
        });
        persistLocalInvitations();
        notify();
      }, (err) => {
        handleFirestoreError(err);
      });

      const qSend = query(
        collection(db, 'game_invitations'),
        where('senderId', '==', userId)
      );
      unsubFirestore2 = onSnapshot(qSend, (snap) => {
        snap.docs.forEach((d) => {
          const data = d.data() as GameInvitation;
          if (data && data.id) {
            localInvitationsMap.set(data.id, data);
          }
        });
        persistLocalInvitations();
        notify();
      }, (err) => {
        handleFirestoreError(err);
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  // Periodic expiration checker interval
  const timer = setInterval(() => {
    notify();
  }, 3000);

  return () => {
    gameChannel?.removeEventListener('message', handleBroadcast);
    clearInterval(timer);
    unsubFirestore1?.();
    unsubFirestore2?.();
  };
}

/**
 * Responds to a game invitation (Accept or Decline)
 */
export async function respondToGameInvitation(
  invitationId: string,
  accept: boolean,
  currentUser: UserProfile
): Promise<GameSession | null> {
  let invitation = localInvitationsMap.get(invitationId);
  const now = Date.now();

  if (!invitation && isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'game_invitations', invitationId));
      if (snap.exists()) {
        invitation = snap.data() as GameInvitation;
        localInvitationsMap.set(invitationId, invitation);
      }
    } catch {}
  }

  if (!invitation) return null;

  invitation.status = accept ? 'accepted' : 'declined';
  localInvitationsMap.set(invitationId, invitation);
  persistLocalInvitations();

  let game = localGamesMap.get(invitation.gameId);
  if (!game && isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'games', invitation.gameId));
      if (snap.exists()) {
        game = snap.data() as GameSession;
        localGamesMap.set(invitation.gameId, game);
      }
    } catch {}
  }

  if (!game && accept) {
    const isChess = invitation.gameType === 'chess';
    const timerMs = 10 * 60 * 1000;
    game = {
      id: invitation.gameId,
      gameType: invitation.gameType,
      mode: 'online',
      playerX: invitation.senderId,
      playerO: invitation.receiverId,
      playerWhite: invitation.senderId,
      playerBlack: invitation.receiverId,
      playerXInfo: {
        uid: invitation.senderId,
        displayName: invitation.senderName,
        photoURL: invitation.senderAvatar,
        username: invitation.senderUsername
      },
      playerOInfo: {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        username: currentUser.username
      },
      playerWhiteInfo: {
        uid: invitation.senderId,
        displayName: invitation.senderName,
        photoURL: invitation.senderAvatar,
        username: invitation.senderUsername
      },
      playerBlackInfo: {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        username: currentUser.username
      },
      board: isChess ? [] : ['', '', '', '', '', '', '', '', ''],
      fen: isChess ? INITIAL_FEN : undefined,
      pgn: isChess ? '' : undefined,
      chessMoveHistory: [],
      timerInitialMinutes: isChess ? 10 : undefined,
      whiteTimeRemaining: isChess ? timerMs : undefined,
      blackTimeRemaining: isChess ? timerMs : undefined,
      isClockActive: isChess,
      lastMoveTimestamp: now,
      currentTurn: invitation.senderId,
      currentSymbol: 'X',
      starter: invitation.senderId,
      starterSymbol: 'X',
      round: 1,
      status: 'active',
      winner: null,
      winningLine: null,
      scores: { playerX: 0, playerO: 0, draws: 0 },
      rematchAcceptedBy: [],
      createdAt: invitation.createdAt,
      updatedAt: now
    };
  }

  if (game) {
    if (accept) {
      game.status = 'active';
      game.updatedAt = now;
    } else {
      game.status = 'cancelled';
      game.updatedAt = now;
    }
    localGamesMap.set(game.id, game);
    persistLocalGames();
  }

  // Broadcast update
  gameChannel?.postMessage({ 
    type: 'INVITATION_UPDATED', 
    invitation, 
    game 
  });

  // Firestore update
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'game_invitations', invitationId), {
        status: invitation.status
      });
      if (game) {
        await setDoc(doc(db, 'games', game.id), game, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore respond invite update note:', err);
    }
  }

  return accept ? game || null : null;
}

/**
 * Cancels a pending game invitation
 */
export async function cancelGameInvitation(invitationId: string): Promise<void> {
  const invitation = localInvitationsMap.get(invitationId);
  if (!invitation) return;

  invitation.status = 'cancelled';
  localInvitationsMap.set(invitationId, invitation);
  persistLocalInvitations();

  const game = localGamesMap.get(invitation.gameId);
  if (game) {
    game.status = 'cancelled';
    game.updatedAt = Date.now();
    localGamesMap.set(game.id, game);
    persistLocalGames();
  }

  gameChannel?.postMessage({ type: 'INVITATION_UPDATED', invitation, game });

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'game_invitations', invitationId), { status: 'cancelled' });
      if (game) {
        await updateDoc(doc(db, 'games', game.id), { status: 'cancelled', updatedAt: Date.now() });
      }
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

/**
 * Creates an offline or robot local GameSession
 */
export function createLocalGameSession(
  mode: GameMode,
  playerXName: string,
  playerOName: string,
  playerXAvatar?: string,
  playerOAvatar?: string,
  playerXUid = 'player1',
  playerOUid = 'player2'
): GameSession {
  const gameId = generateId(`game_${mode}`);
  const now = Date.now();

  const session: GameSession = {
    id: gameId,
    gameType: 'tic-tac-toe',
    mode,
    playerX: playerXUid,
    playerO: playerOUid,
    playerXInfo: {
      uid: playerXUid,
      displayName: playerXName,
      photoURL: playerXAvatar,
      username: mode === 'robot' ? 'you' : 'player1'
    },
    playerOInfo: {
      uid: playerOUid,
      displayName: playerOName,
      photoURL: playerOAvatar,
      username: mode === 'robot' ? 'robot' : 'player2'
    },
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: playerXUid,
    currentSymbol: 'X',
    starter: playerXUid,
    starterSymbol: 'X',
    round: 1,
    status: 'active',
    winner: null,
    winningLine: null,
    scores: {
      playerX: 0,
      playerO: 0,
      draws: 0
    },
    rematchAcceptedBy: [],
    createdAt: now,
    updatedAt: now
  };

  localGamesMap.set(gameId, session);
  persistLocalGames();
  return session;
}

/**
 * Creates a local or robot Chess GameSession
 */
export function createLocalChessSession(
  mode: GameMode,
  p1Name: string,
  p2Name: string,
  p1Avatar?: string,
  p2Avatar?: string,
  p1Uid = 'player1',
  p2Uid = 'player2',
  p1Color: 'w' | 'b' = 'w',
  difficulty: ChessDifficulty = 'medium',
  timerMinutes?: number
): GameSession {
  const gameId = generateId(`chess_${mode}`);
  const now = Date.now();

  const isP1White = p1Color === 'w';
  const whiteUid = isP1White ? p1Uid : p2Uid;
  const blackUid = isP1White ? p2Uid : p1Uid;
  const whiteName = isP1White ? p1Name : p2Name;
  const blackName = isP1White ? p2Name : p1Name;
  const whiteAvatar = isP1White ? p1Avatar : p2Avatar;
  const blackAvatar = isP1White ? p2Avatar : p1Avatar;

  const timerMs = timerMinutes ? timerMinutes * 60 * 1000 : undefined;

  const session: GameSession = {
    id: gameId,
    gameType: 'chess',
    mode,
    playerX: whiteUid, // White
    playerO: blackUid, // Black
    playerWhite: whiteUid,
    playerBlack: blackUid,
    playerXInfo: {
      uid: whiteUid,
      displayName: whiteName,
      photoURL: whiteAvatar,
      username: whiteUid === 'robot' ? 'robot' : 'player1'
    },
    playerOInfo: {
      uid: blackUid,
      displayName: blackName,
      photoURL: blackAvatar,
      username: blackUid === 'robot' ? 'robot' : 'player2'
    },
    playerWhiteInfo: {
      uid: whiteUid,
      displayName: whiteName,
      photoURL: whiteAvatar,
      username: whiteUid === 'robot' ? 'robot' : 'player1'
    },
    playerBlackInfo: {
      uid: blackUid,
      displayName: blackName,
      photoURL: blackAvatar,
      username: blackUid === 'robot' ? 'robot' : 'player2'
    },
    board: [],
    fen: INITIAL_FEN,
    pgn: '',
    chessMoveHistory: [],
    chessDifficulty: difficulty,
    currentTurn: whiteUid,
    currentSymbol: 'X',
    starter: whiteUid,
    starterSymbol: 'X',
    round: 1,
    status: 'active',
    winner: null,
    winningLine: null,
    scores: {
      playerX: 0,
      playerO: 0,
      draws: 0
    },
    timerInitialMinutes: timerMinutes,
    whiteTimeRemaining: timerMs,
    blackTimeRemaining: timerMs,
    isClockActive: !!timerMinutes,
    lastMoveTimestamp: now,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    rematchAcceptedBy: [],
    createdAt: now,
    updatedAt: now
  };

  localGamesMap.set(gameId, session);
  persistLocalGames();
  return session;
}

/**
 * Subscribes to real-time updates for a Game Session
 */
export function subscribeToGame(
  gameId: string,
  callback: (game: GameSession | null) => void
): () => void {
  const notify = () => {
    const game = localGamesMap.get(gameId) || null;
    callback(game ? { ...game } : null);
  };

  // Immediate notification
  notify();

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'GAME_UPDATED' && event.data.game?.id === gameId) {
      localGamesMap.set(gameId, event.data.game);
      persistLocalGames();
      notify();
    }
  };

  gameChannel?.addEventListener('message', handleBroadcast);

  let unsubFirestore: Unsubscribe | null = null;
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      unsubFirestore = onSnapshot(doc(db, 'games', gameId), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GameSession;
          localGamesMap.set(gameId, data);
          persistLocalGames();
          notify();
        }
      }, (err) => {
        handleFirestoreError(err);
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return () => {
    gameChannel?.removeEventListener('message', handleBroadcast);
    unsubFirestore?.();
  };
}

/**
 * Executes a player move on the board with server-authoritative rules
 */
export async function executeGameMove(
  gameId: string,
  cellIndex: number,
  playerUid: string,
  symbol: TicTacToeSymbol
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game) return null;

  // 1. Board & status validation
  if (game.status !== 'active') return null;
  if (cellIndex < 0 || cellIndex > 8) return null;
  if (game.board[cellIndex] !== '') return null; // Occupied cell

  const now = Date.now();
  const nextBoard = [...game.board];
  nextBoard[cellIndex] = symbol;

  const evalResult = evaluateBoard(nextBoard);

  const updatedGame: GameSession = {
    ...game,
    board: nextBoard,
    lastMoveAt: now,
    updatedAt: now
  };

  const scores = updatedGame.scores || { playerX: 0, playerO: 0, draws: 0 };

  if (evalResult.winner) {
    updatedGame.status = 'won';
    updatedGame.winner = playerUid;
    updatedGame.winningLine = evalResult.winningLine;
    if (symbol === 'X') scores.playerX += 1;
    else scores.playerO += 1;
    updatedGame.scores = scores;
  } else if (evalResult.isDraw) {
    updatedGame.status = 'draw';
    updatedGame.winner = null;
    updatedGame.winningLine = null;
    scores.draws += 1;
    updatedGame.scores = scores;
  } else {
    // Switch turn
    const nextSymbol: TicTacToeSymbol = symbol === 'X' ? 'O' : 'X';
    const nextTurnUid = (playerUid === game.playerX || symbol === 'X') ? game.playerO : game.playerX;
    updatedGame.currentTurn = nextTurnUid;
    updatedGame.currentSymbol = nextSymbol;
  }

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();

  // Broadcast to other tabs
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  // Sync to Firestore for online multiplayer
  if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        board: updatedGame.board,
        status: updatedGame.status,
        winner: updatedGame.winner,
        winningLine: updatedGame.winningLine,
        scores: updatedGame.scores,
        currentTurn: updatedGame.currentTurn,
        currentSymbol: updatedGame.currentSymbol,
        lastMoveAt: now,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore executeGameMove note:', err);
    }
  }

  return updatedGame;
}

/**
 * Handles Rematch Request & Draw-Restart Logic
 * 
 * CRITICAL RULE (Draw Rematch Starter Rule):
 * If the previous round was a DRAW, the starting player MUST alternate to the OPPONENT
 * of whoever started the previous round!
 * 
 * Round 1: Player A starts
 * DRAW -> Round 2: Player B starts
 * DRAW -> Round 3: Player A starts
 */
export async function requestGameRematch(
  gameId: string,
  playerUid: string
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game) return null;

  const now = Date.now();
  const accepted = new Set(game.rematchAcceptedBy || []);
  accepted.add(playerUid);

  // In offline or robot mode, 1 player requesting rematch immediately starts new round
  const isSingleDevice = game.mode === 'robot' || game.mode === 'offline';
  const bothAccepted = isSingleDevice || (accepted.has(game.playerX) && accepted.has(game.playerO));

  if (!bothAccepted) {
    // Waiting for opponent
    const updatedGame: GameSession = {
      ...game,
      rematchRequestedBy: playerUid,
      rematchAcceptedBy: Array.from(accepted),
      updatedAt: now
    };
    localGamesMap.set(gameId, updatedGame);
    persistLocalGames();
    gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        await updateDoc(doc(db, 'games', gameId), {
          rematchRequestedBy: playerUid,
          rematchAcceptedBy: Array.from(accepted),
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err);
      }
    }
    return updatedGame;
  }

  // BOTH PLAYERS ACCEPTED -> START NEW ROUND!
  const wasDraw = game.status === 'draw';
  
  // Calculate next starter:
  // After a DRAW: MUST switch to the opponent of the previous round starter!
  // After a WIN: alternate starter to keep fairness.
  const prevStarterUid = game.starter;
  const nextStarterUid = prevStarterUid === game.playerX ? game.playerO : game.playerX;
  
  // In Tic-TacToe, the starting player plays 'X'.
  // We swap player assignments or keep player roles and set starter:
  // To keep player identity consistent:
  // If nextStarterUid is playerO, playerO gets first turn ('O' or starter plays 'X').
  // Standard rule: The designated starter gets the first turn.
  const nextRound = (game.round || 1) + 1;

  const newGameSession: GameSession = {
    ...game,
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: nextStarterUid,
    currentSymbol: 'X',
    starter: nextStarterUid,
    starterSymbol: 'X',
    // We swap playerX and playerO so the starter always plays 'X'
    playerX: nextStarterUid,
    playerO: nextStarterUid === game.playerX ? game.playerO : game.playerX,
    playerXInfo: nextStarterUid === game.playerX ? game.playerXInfo : game.playerOInfo,
    playerOInfo: nextStarterUid === game.playerX ? game.playerOInfo : game.playerXInfo,
    round: nextRound,
    status: 'active',
    winner: null,
    winningLine: null,
    rematchRequestedBy: null,
    rematchAcceptedBy: [],
    updatedAt: now
  };

  localGamesMap.set(gameId, newGameSession);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: newGameSession });

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        board: newGameSession.board,
        currentTurn: newGameSession.currentTurn,
        currentSymbol: newGameSession.currentSymbol,
        starter: newGameSession.starter,
        starterSymbol: newGameSession.starterSymbol,
        playerX: newGameSession.playerX,
        playerO: newGameSession.playerO,
        playerXInfo: newGameSession.playerXInfo,
        playerOInfo: newGameSession.playerOInfo,
        round: newGameSession.round,
        status: 'active',
        winner: null,
        winningLine: null,
        rematchRequestedBy: null,
        rematchAcceptedBy: [],
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore rematch start note:', err);
    }
  }

  return newGameSession;
}

/**
 * Leaves or concludes an active game
 */
export async function leaveGame(gameId: string, playerUid: string): Promise<void> {
  const game = localGamesMap.get(gameId);
  if (!game) return;

  const now = Date.now();
  const updatedGame: GameSession = {
    ...game,
    status: 'finished',
    updatedAt: now
  };

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished',
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

/**
 * Executes a verified chess move using chess.js engine validation
 */
export async function executeChessMove(
  gameId: string,
  from: string,
  to: string,
  promotion: string | undefined,
  playerUid: string
): Promise<{ success: boolean; game: GameSession | null; error?: string }> {
  const game = localGamesMap.get(gameId);
  if (!game) return { success: false, game: null, error: 'Game not found' };

  if (game.status !== 'active') {
    return { success: false, game, error: 'Game is not active' };
  }

  const chess = createChessInstance(game.fen || INITIAL_FEN);
  const currentTurnColor = chess.turn(); // 'w' | 'b'
  const whitePlayerId = game.playerWhite || game.playerX;
  const blackPlayerId = game.playerBlack || game.playerO;

  // Turn validation adapted for online, robot, and offline modes
  if (game.mode === 'online') {
    if (game.currentTurn !== playerUid) {
      return { success: false, game, error: 'Not your turn' };
    }
    const isPlayerWhite = playerUid === whitePlayerId;
    if ((currentTurnColor === 'w' && !isPlayerWhite) || (currentTurnColor === 'b' && isPlayerWhite)) {
      return { success: false, game, error: 'Invalid player turn for color' };
    }
  } else if (game.mode === 'robot') {
    const isRobotTurn = game.currentTurn === 'robot';
    if (isRobotTurn && playerUid !== 'robot') {
      return { success: false, game, error: 'Robot is currently thinking' };
    }
    if (!isRobotTurn && playerUid === 'robot') {
      return { success: false, game, error: 'Waiting for player move' };
    }
  }

  try {
    const moveResult = chess.move({
      from,
      to,
      promotion: promotion ? (promotion.toLowerCase() as any) : undefined
    });

    if (!moveResult) {
      return { success: false, game, error: 'Illegal chess move' };
    }

    const now = Date.now();
    const elapsedSinceLastMove = game.lastMoveTimestamp ? Math.max(0, now - game.lastMoveTimestamp) : 0;

    let whiteTimeRemaining = game.whiteTimeRemaining;
    let blackTimeRemaining = game.blackTimeRemaining;

    if (game.isClockActive && whiteTimeRemaining !== undefined && blackTimeRemaining !== undefined) {
      if (currentTurnColor === 'w') {
        whiteTimeRemaining = Math.max(0, whiteTimeRemaining - elapsedSinceLastMove);
      } else {
        blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsedSinceLastMove);
      }
    }

    const moveRecord: ChessMoveRecord = {
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece,
      color: moveResult.color as any,
      san: moveResult.san,
      flags: moveResult.flags,
      captured: moveResult.captured,
      promotion: moveResult.promotion,
      fenAfter: chess.fen(),
      timestamp: now
    };

    const newHistory = [...(game.chessMoveHistory || []), moveRecord];
    const nextTurnColor = chess.turn();
    const whitePlayerId = game.playerWhite || game.playerX;
    const blackPlayerId = game.playerBlack || game.playerO;
    const nextTurnPlayerId = nextTurnColor === 'w' ? whitePlayerId : blackPlayerId;

    const isCheck = chess.inCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isThreefold = chess.isThreefoldRepetition();
    const isInsufficient = chess.isInsufficientMaterial();
    const isDraw50 = chess.isDraw();

    let status: GameStatus = 'active';
    let winner: string | null = null;
    let winReason: string | null = null;
    let drawReason: string | null = null;

    if (isCheckmate) {
      status = 'won';
      winner = playerUid;
      winReason = 'checkmate';
    } else if (isStalemate) {
      status = 'draw';
      drawReason = 'stalemate';
    } else if (isThreefold) {
      status = 'draw';
      drawReason = 'threefold';
    } else if (isInsufficient) {
      status = 'draw';
      drawReason = 'insufficient-material';
    } else if (isDraw50) {
      status = 'draw';
      drawReason = 'fifty-moves';
    }

    const scores = { ...(game.scores || { playerX: 0, playerO: 0, draws: 0 }) };
    if (status === 'won' && winner) {
      if (winner === whitePlayerId) scores.playerX += 1;
      else scores.playerO += 1;
    } else if (status === 'draw') {
      scores.draws += 1;
    }

    const updatedGame: GameSession = {
      ...game,
      fen: chess.fen(),
      pgn: chess.pgn(),
      chessMoveHistory: newHistory,
      currentTurn: nextTurnPlayerId,
      status,
      winner,
      winReason,
      drawReason,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw: status === 'draw',
      whiteTimeRemaining,
      blackTimeRemaining,
      lastMoveTimestamp: now,
      lastMoveAt: now,
      drawOfferFrom: null, // Clear any pending draw offer on move
      takebackOfferFrom: null,
      scores,
      updatedAt: now
    };

    localGamesMap.set(gameId, updatedGame);
    persistLocalGames();
    gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

    if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
      try {
        await updateDoc(doc(db, 'games', gameId), {
          fen: updatedGame.fen,
          pgn: updatedGame.pgn,
          chessMoveHistory: updatedGame.chessMoveHistory,
          currentTurn: updatedGame.currentTurn,
          status: updatedGame.status,
          winner: updatedGame.winner,
          winReason: updatedGame.winReason,
          drawReason: updatedGame.drawReason,
          isCheck: updatedGame.isCheck,
          isCheckmate: updatedGame.isCheckmate,
          isStalemate: updatedGame.isStalemate,
          isDraw: updatedGame.isDraw,
          whiteTimeRemaining: updatedGame.whiteTimeRemaining,
          blackTimeRemaining: updatedGame.blackTimeRemaining,
          lastMoveTimestamp: now,
          lastMoveAt: now,
          drawOfferFrom: null,
          scores: updatedGame.scores,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore chess move update error:', err);
      }
    }

    return { success: true, game: updatedGame };
  } catch (err: any) {
    return { success: false, game, error: err?.message || 'Move failed' };
  }
}

/**
 * Resign an active Chess game
 */
export async function resignChessGame(
  gameId: string,
  resigningPlayerUid: string
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game || game.status !== 'active') return null;

  const now = Date.now();
  const whitePlayerId = game.playerWhite || game.playerX;
  const blackPlayerId = game.playerBlack || game.playerO;
  const winnerUid = resigningPlayerUid === whitePlayerId ? blackPlayerId : whitePlayerId;

  const scores = { ...(game.scores || { playerX: 0, playerO: 0, draws: 0 }) };
  if (winnerUid === whitePlayerId) scores.playerX += 1;
  else scores.playerO += 1;

  const updatedGame: GameSession = {
    ...game,
    status: 'won',
    winner: winnerUid,
    winReason: 'resignation',
    resignedBy: resigningPlayerUid,
    scores,
    updatedAt: now
  };

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: updatedGame.status,
        winner: updatedGame.winner,
        winReason: updatedGame.winReason,
        resignedBy: updatedGame.resignedBy,
        scores: updatedGame.scores,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return updatedGame;
}

/**
 * Offer or respond to draw in Chess
 */
export async function offerChessDraw(
  gameId: string,
  offeringPlayerUid: string
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game || game.status !== 'active') return null;

  const now = Date.now();
  const updatedGame: GameSession = {
    ...game,
    drawOfferFrom: offeringPlayerUid,
    updatedAt: now
  };

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        drawOfferFrom: offeringPlayerUid,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return updatedGame;
}

export async function respondChessDrawOffer(
  gameId: string,
  accepting: boolean
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game || game.status !== 'active') return null;

  const now = Date.now();
  const scores = { ...(game.scores || { playerX: 0, playerO: 0, draws: 0 }) };

  let updatedGame: GameSession;
  if (accepting) {
    scores.draws += 1;
    updatedGame = {
      ...game,
      status: 'draw',
      winner: null,
      drawReason: 'agreement',
      isDraw: true,
      drawOfferFrom: null,
      scores,
      updatedAt: now
    };
  } else {
    updatedGame = {
      ...game,
      drawOfferFrom: null,
      updatedAt: now
    };
  }

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: updatedGame.status,
        winner: updatedGame.winner,
        drawReason: updatedGame.drawReason,
        isDraw: updatedGame.isDraw,
        drawOfferFrom: null,
        scores: updatedGame.scores,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return updatedGame;
}

/**
 * Handle timeout in chess
 */
export async function timeoutChessGame(
  gameId: string,
  timedOutPlayerUid: string
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game || game.status !== 'active') return null;

  const now = Date.now();
  const whitePlayerId = game.playerWhite || game.playerX;
  const blackPlayerId = game.playerBlack || game.playerO;
  const winnerUid = timedOutPlayerUid === whitePlayerId ? blackPlayerId : whitePlayerId;

  // Check if opponent has sufficient mating material
  const chess = createChessInstance(game.fen || INITIAL_FEN);
  const isInsufficient = chess.isInsufficientMaterial();

  const scores = { ...(game.scores || { playerX: 0, playerO: 0, draws: 0 }) };

  let status: GameStatus = 'won';
  let winner: string | null = winnerUid;
  let winReason: string | null = 'timeout';
  let drawReason: string | null = null;

  if (isInsufficient) {
    status = 'draw';
    winner = null;
    winReason = null;
    drawReason = 'insufficient-material';
    scores.draws += 1;
  } else {
    if (winnerUid === whitePlayerId) scores.playerX += 1;
    else scores.playerO += 1;
  }

  const updatedGame: GameSession = {
    ...game,
    status,
    winner,
    winReason,
    drawReason,
    whiteTimeRemaining: timedOutPlayerUid === whitePlayerId ? 0 : game.whiteTimeRemaining,
    blackTimeRemaining: timedOutPlayerUid === blackPlayerId ? 0 : game.blackTimeRemaining,
    scores,
    updatedAt: now
  };

  localGamesMap.set(gameId, updatedGame);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

  if (isFirebaseConfigured && db && game.mode === 'online' && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: updatedGame.status,
        winner: updatedGame.winner,
        winReason: updatedGame.winReason,
        drawReason: updatedGame.drawReason,
        whiteTimeRemaining: updatedGame.whiteTimeRemaining,
        blackTimeRemaining: updatedGame.blackTimeRemaining,
        scores: updatedGame.scores,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return updatedGame;
}

/**
 * Restart or rematch chess game
 */
export async function requestChessRematch(
  gameId: string,
  playerUid: string
): Promise<GameSession | null> {
  const game = localGamesMap.get(gameId);
  if (!game) return null;

  const now = Date.now();
  const accepted = new Set(game.rematchAcceptedBy || []);
  accepted.add(playerUid);

  const isSingleDevice = game.mode === 'robot' || game.mode === 'offline';
  const bothAccepted = isSingleDevice || (accepted.has(game.playerX) && accepted.has(game.playerO));

  if (!bothAccepted) {
    const updatedGame: GameSession = {
      ...game,
      rematchRequestedBy: playerUid,
      rematchAcceptedBy: Array.from(accepted),
      updatedAt: now
    };
    localGamesMap.set(gameId, updatedGame);
    persistLocalGames();
    gameChannel?.postMessage({ type: 'GAME_UPDATED', game: updatedGame });

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        await updateDoc(doc(db, 'games', gameId), {
          rematchRequestedBy: playerUid,
          rematchAcceptedBy: Array.from(accepted),
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err);
      }
    }
    return updatedGame;
  }

  // Both accepted - swap white and black for fair play
  const prevWhite = game.playerWhite || game.playerX;
  const prevBlack = game.playerBlack || game.playerO;
  const newWhite = prevBlack;
  const newBlack = prevWhite;
  const newWhiteInfo = newWhite === game.playerX ? game.playerXInfo : game.playerOInfo;
  const newBlackInfo = newBlack === game.playerX ? game.playerXInfo : game.playerOInfo;

  const timerMs = game.timerInitialMinutes ? game.timerInitialMinutes * 60 * 1000 : undefined;

  const newGameSession: GameSession = {
    ...game,
    fen: INITIAL_FEN,
    pgn: '',
    chessMoveHistory: [],
    playerWhite: newWhite,
    playerBlack: newBlack,
    playerX: newWhite,
    playerO: newBlack,
    playerWhiteInfo: newWhiteInfo,
    playerBlackInfo: newBlackInfo,
    playerXInfo: newWhiteInfo,
    playerOInfo: newBlackInfo,
    currentTurn: newWhite, // White always goes first in chess
    round: (game.round || 1) + 1,
    status: 'active',
    winner: null,
    winReason: null,
    drawReason: null,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    whiteTimeRemaining: timerMs,
    blackTimeRemaining: timerMs,
    lastMoveTimestamp: now,
    rematchRequestedBy: null,
    rematchAcceptedBy: [],
    drawOfferFrom: null,
    takebackOfferFrom: null,
    resignedBy: null,
    updatedAt: now
  };

  localGamesMap.set(gameId, newGameSession);
  persistLocalGames();
  gameChannel?.postMessage({ type: 'GAME_UPDATED', game: newGameSession });

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        fen: INITIAL_FEN,
        pgn: '',
        chessMoveHistory: [],
        playerWhite: newWhite,
        playerBlack: newBlack,
        playerX: newWhite,
        playerO: newBlack,
        playerWhiteInfo: newWhiteInfo,
        playerBlackInfo: newBlackInfo,
        playerXInfo: newWhiteInfo,
        playerOInfo: newBlackInfo,
        currentTurn: newWhite,
        round: newGameSession.round,
        status: 'active',
        winner: null,
        winReason: null,
        drawReason: null,
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        whiteTimeRemaining: timerMs,
        blackTimeRemaining: timerMs,
        lastMoveTimestamp: now,
        rematchRequestedBy: null,
        rematchAcceptedBy: [],
        drawOfferFrom: null,
        takebackOfferFrom: null,
        resignedBy: null,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return newGameSession;
}

/**
 * Saves a completed game item to user's match history
 */
export async function saveGameHistory(userId: string, item: Omit<GameHistoryItem, 'id'>): Promise<void> {
  const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
  const newItem: GameHistoryItem = {
    ...item,
    id: generateId('hist')
  };

  const list = safeGetItem<GameHistoryItem[]>(historyKey) || [];
  list.unshift(newItem);
  // Keep last 30 games
  const trimmed = list.slice(0, 30);
  safeSetItem(historyKey, trimmed);

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await setDoc(doc(db, 'users', userId, 'game_history', newItem.id), newItem);
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

/**
 * Retrieves match history for a user
 */
export function getGameHistory(userId: string): GameHistoryItem[] {
  const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
  return safeGetItem<GameHistoryItem[]>(historyKey) || [];
}
