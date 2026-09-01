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
  TicTacToeSymbol 
} from '../types';
import { evaluateBoard, getNextRoundStarter } from './tictactoeEngine';
import { safeGetItem, safeSetItem } from './storageEngine';

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
  sender: UserProfile,
  receiver: UserProfile,
  gameType: GameType = 'tic-tac-toe'
): Promise<GameInvitation> {
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
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: sender.uid,
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
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'game_invitations', invitationId), invitation);
      await setDoc(doc(db, 'games', gameId), initialGame);
    } catch (err) {
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
 * Checks if a user is currently inside an active game
 */
export function isUserInActiveGame(userId: string): boolean {
  for (const game of localGamesMap.values()) {
    if (
      (game.status === 'active' || game.status === 'waiting') &&
      (game.playerX === userId || game.playerO === userId) &&
      Date.now() - game.updatedAt < 120000 // Active within last 2 mins
    ) {
      return true;
    }
  }
  return false;
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

  if (isFirebaseConfigured && db) {
    try {
      const qRecv = query(
        collection(db, 'game_invitations'),
        where('receiverId', '==', userId)
      );
      unsubFirestore1 = onSnapshot(qRecv, (snap) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data() as GameInvitation;
          localInvitationsMap.set(data.id, data);
        });
        persistLocalInvitations();
        notify();
      }, (err) => console.warn('Firestore invite recv listener note:', err));

      const qSend = query(
        collection(db, 'game_invitations'),
        where('senderId', '==', userId)
      );
      unsubFirestore2 = onSnapshot(qSend, (snap) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data() as GameInvitation;
          localInvitationsMap.set(data.id, data);
        });
        persistLocalInvitations();
        notify();
      }, (err) => console.warn('Firestore invite send listener note:', err));
    } catch (err) {
      console.warn('Firestore invitations setup note:', err);
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
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'game_invitations', invitationId), {
        status: invitation.status
      });
      if (game) {
        await updateDoc(doc(db, 'games', game.id), {
          status: game.status,
          updatedAt: now
        });
      }
    } catch (err) {
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

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'game_invitations', invitationId), { status: 'cancelled' });
      if (game) {
        await updateDoc(doc(db, 'games', game.id), { status: 'cancelled', updatedAt: Date.now() });
      }
    } catch {}
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
  if (isFirebaseConfigured && db) {
    try {
      unsubFirestore = onSnapshot(doc(db, 'games', gameId), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GameSession;
          localGamesMap.set(gameId, data);
          persistLocalGames();
          notify();
        }
      }, (err) => console.warn('Firestore game listener note:', err));
    } catch (err) {
      console.warn('Firestore subscribeToGame note:', err);
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
  if (isFirebaseConfigured && db && game.mode === 'online') {
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

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'games', gameId), {
          rematchRequestedBy: playerUid,
          rematchAcceptedBy: Array.from(accepted),
          updatedAt: now
        });
      } catch {}
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

  if (isFirebaseConfigured && db) {
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

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished',
        updatedAt: now
      });
    } catch {}
  }
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

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', userId, 'game_history', newItem.id), newItem);
    } catch {}
  }
}

/**
 * Retrieves match history for a user
 */
export function getGameHistory(userId: string): GameHistoryItem[] {
  const historyKey = `${LOCAL_HISTORY_PREFIX}${userId}`;
  return safeGetItem<GameHistoryItem[]>(historyKey) || [];
}
