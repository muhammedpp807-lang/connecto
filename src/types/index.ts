export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  about?: string;
  isOnline: boolean;
  lastSeen: number;
  role?: 'user' | 'admin';
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'audio' | 'system';

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

export interface UserSettings {
  appearance: 'light' | 'dark' | 'system';
  themeColor?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'indigo' | 'cyan';
  chatBackground?: 'default' | 'doodle' | 'dark-mesh' | 'geometric' | 'gradient-warm' | 'solid-slate' | 'solid-emerald' | 'solid-midnight';
  appBackground?: 'default' | 'minimal' | 'midnight' | 'warm' | 'emerald';
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
