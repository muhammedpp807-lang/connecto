export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  about?: string;
  website?: string;
  location?: string;
  statusMessage?: string;
  coverURL?: string;
  contacts?: string[];
  isOnline: boolean;
  lastSeen: number;
  role?: 'user' | 'admin';
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'audio' | 'sticker' | 'system';

export interface MessageReplyTarget {
  id: string;
  senderName?: string;
  text?: string;
  type?: MessageType;
  fileUrl?: string;
  stickerEmoji?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string; // Optional for group messages
  senderName?: string;
  senderAvatar?: string;
  text?: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  videoDuration?: number;
  audioDuration?: number;
  audioWaveform?: number[];
  replyTo?: MessageReplyTarget;
  delivered: boolean;
  read: boolean;
  createdAt: number;
  updatedAt?: number;
  reactions?: Record<string, string>; // userId -> emoji
  deletedForEveryone?: boolean;
  deletedForUsers?: string[]; // userIds who deleted this message for themselves
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants?: Record<string, UserProfile>;
  isGroup?: boolean;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  adminIds?: string[];
  createdBy?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  lastMessageType?: MessageType;
  lastSenderId?: string;
  lastSenderName?: string;
  unreadCount?: Record<string, number>;
  typingUsers?: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export type ThemeColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'orange' | 'teal' | 'crimson';
export type BubbleRadius = 'sharp' | 'subtle' | 'rounded' | 'extra-round' | 'pill';
export type BubbleFontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type BubbleColorScheme = 'theme' | 'emerald' | 'blue' | 'purple' | 'midnight' | 'sunset' | 'cyber' | 'monochrome';

export interface BubbleSettings {
  radius: BubbleRadius;
  fontSize: BubbleFontSize;
  colorScheme: BubbleColorScheme;
  bubbleOpacity: number; // 60 - 100
  densePadding: boolean;
}

export interface StatusViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: number;
}

export type StatusExpiryOption = '1h' | '6h' | '12h' | '24h' | '48h' | '7d' | '30d' | 'never';

export interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userUsername?: string;
  type: 'video' | 'image' | 'text';
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  filter?: 'normal' | 'warm' | 'monochrome' | 'vivid' | 'cyber' | 'sunset';
  textBackground?: string;
  textColor?: string;
  duration?: number;
  isMuted?: boolean;
  viewers?: StatusViewer[];
  createdAt: number;
  expiresAt: number; // 0 for never / permanent, or future timestamp ms
  expiryOption?: StatusExpiryOption;
}

export type UserStatus = StatusItem;

export interface UserStatusGroup {
  userId: string;
  userName: string;
  userAvatar?: string;
  userUsername?: string;
  statuses: StatusItem[];
  hasUnseen: boolean;
  lastUpdated: number;
}

export interface UserSettings {
  appearance: 'light' | 'dark' | 'system';
  themeColor?: ThemeColor;
  chatBackground?: string;
  appBackground?: string;
  customAppWallpaper?: string;
  customChatWallpaper?: string;
  chatWallpaperBlur?: number;
  chatWallpaperBrightness?: number;
  bubbleSettings?: BubbleSettings;
  sounds: boolean;
  browserNotifications: boolean;
  readReceipts: boolean;
  lastSeenPrivacy: 'everyone' | 'nobody';
  onlineStatusPrivacy: 'everyone' | 'nobody';
}

export interface SystemStats {
  totalUsers: number;
  activeNow: number;
  totalMessages: number;
  totalConversations: number;
  storageUsedMb: number;
  uptimeHours: number;
}

// -------------------------------------------------------------
// Games Feature Types
// -------------------------------------------------------------

export type GameType = 'tic-tac-toe';
export type GameMode = 'robot' | 'offline' | 'online';
export type GameStatus = 'waiting' | 'active' | 'won' | 'draw' | 'finished' | 'cancelled';
export type TicTacToeSymbol = 'X' | 'O';
export type TicTacToeBoard = ('' | 'X' | 'O')[];

export interface GamePlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  username?: string;
}

export interface GameSession {
  id: string;
  gameType: GameType;
  mode: GameMode;
  playerX: string; // userId or 'human' / 'player1'
  playerO: string; // userId or 'robot' / 'player2'
  playerXInfo?: GamePlayerInfo;
  playerOInfo?: GamePlayerInfo;
  board: string[]; // 9 elements: empty string, 'X', or 'O'
  currentTurn: string; // userId or 'playerX' / 'playerO' / 'X' / 'O'
  currentSymbol: TicTacToeSymbol;
  starter: string; // userId or symbol who made the first move in current round
  starterSymbol: TicTacToeSymbol;
  round: number;
  status: GameStatus;
  winner: string | null; // userId or symbol 'X' / 'O' / 'robot'
  winningLine?: number[] | null; // e.g. [0, 1, 2]
  scores?: {
    playerX: number;
    playerO: number;
    draws: number;
  };
  rematchRequestedBy?: string | null;
  rematchAcceptedBy?: string[];
  lastMoveAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface GameInvitation {
  id: string;
  gameType: GameType;
  gameId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderUsername?: string;
  receiverId: string;
  receiverName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number;
}

export interface GameHistoryItem {
  id: string;
  gameType: GameType;
  mode: GameMode;
  opponentName: string;
  opponentAvatar?: string;
  result: 'won' | 'lost' | 'draw';
  playerSymbol: 'X' | 'O';
  scoreSummary?: string;
  roundsPlayed: number;
  playedAt: number;
}
