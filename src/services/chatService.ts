import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  Unsubscribe,
  increment
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { Conversation, Message, MessageType } from '../types';
import { getAllUsers } from './userService';
import { safeGetItem, safeSetItem, safeRemoveItem, isFirestoreQuotaExhausted, handleFirestoreError } from './storageEngine';

const LOCAL_CONVERSATIONS_KEY = 'connecto_db_conversations';
const LOCAL_MESSAGES_KEY = 'connecto_db_messages';

// Cross-tab broadcast channel for real-time local sync
const chatChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('connecto_chat_channel')
  : null;

// In-memory listeners for immediate same-tab UI synchronization
const localMessageListeners = new Map<string, Set<(msgs: Message[]) => void>>();
const localConversationListeners = new Set<(convs: Conversation[]) => void>();

const FAKE_CONV_IDS = new Set(['seed_conv_bot', 'seed_conv_sarah']);

function purgeFakeConvs(convs: Conversation[]): Conversation[] {
  return convs.filter((c) => {
    if (!c || !c.id) return false;
    if (FAKE_CONV_IDS.has(c.id)) return false;
    if (c.participantIds.includes('user_bot_connecto')) return false;
    if (c.participantIds.includes('user_sarah_jenkins')) return false;
    if (c.participantIds.includes('user_alex_rivera')) return false;
    if (c.participantIds.includes('user_elena_rostova')) return false;
    if (c.participantIds.includes('user_marcus_vance')) return false;
    return true;
  });
}

export function getLocalConversations(): Conversation[] {
  try {
    const raw = safeGetItem<Conversation[]>(LOCAL_CONVERSATIONS_KEY);
    if (raw) {
      const parsed = Array.isArray(raw) ? raw : [];
      const cleaned = purgeFakeConvs(parsed);
      if (cleaned.length !== parsed.length) {
        saveLocalConversations(cleaned);
      }
      return cleaned;
    }
  } catch (err) {
    console.error('Error parsing local conversations:', err);
  }
  return [];
}

export function saveLocalConversations(convs: Conversation[]) {
  try {
    const cleaned = purgeFakeConvs(convs);
    safeSetItem(LOCAL_CONVERSATIONS_KEY, cleaned);
    // Trigger in-memory same-tab listeners immediately
    localConversationListeners.forEach((cb) => {
      try { cb(cleaned); } catch {}
    });
    chatChannel?.postMessage({ type: 'CONVERSATIONS_UPDATED' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connecto_conversations_updated'));
    }
  } catch (err) {
    console.error('Error saving local conversations:', err);
  }
}

export function getLocalMessages(convId: string): Message[] {
  try {
    const raw = safeGetItem<Message[]>(`${LOCAL_MESSAGES_KEY}_${convId}`);
    if (raw && Array.isArray(raw)) {
      return raw;
    }
  } catch (err) {
    console.error('Error parsing local messages:', err);
  }
  return [];
}

export function saveLocalMessages(convId: string, messages: Message[]) {
  try {
    safeSetItem(`${LOCAL_MESSAGES_KEY}_${convId}`, messages);
    // Trigger in-memory same-tab listeners immediately
    const listeners = localMessageListeners.get(convId);
    if (listeners) {
      listeners.forEach((cb) => {
        try { cb(messages); } catch {}
      });
    }
    chatChannel?.postMessage({ type: 'MESSAGES_UPDATED', convId });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connecto_messages_updated', { detail: { convId } }));
    }
  } catch (err) {
    console.error('Error saving local messages:', err);
  }
}

export const getOrCreateConversationId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `conv_${uid1}_${uid2}` : `conv_${uid2}_${uid1}`;
};

export const subscribeToConversations = (
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): Unsubscribe => {
  let unsubFirestore: Unsubscribe | null = null;

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', userId)
      );

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const conversations: Conversation[] = [];
          snapshot.forEach((d) => {
            conversations.push({ id: d.id, ...d.data() } as Conversation);
          });
          
          // Merge with local to preserve immediate optimistic changes
          const local = getLocalConversations();
          const map = new Map<string, Conversation>();
          conversations.forEach((c) => map.set(c.id, c));
          local.forEach((c) => {
            if (c.participantIds?.includes(userId) && !map.has(c.id)) {
              map.set(c.id, c);
            }
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => (b.lastMessageAt || b.updatedAt || 0) - (a.lastMessageAt || a.updatedAt || 0));
          saveLocalConversations(merged);
          onUpdate(merged);
        },
        (err) => {
          handleFirestoreError(err);
          console.warn('Firestore convs snapshot note:', err);
        }
      );
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore subscribeToConversations note:', err);
    }
  }

  // Local real-time subscription
  const fetchAndPush = () => {
    const all = getLocalConversations();
    const userConvs = all.filter((c) => c.participantIds && c.participantIds.includes(userId));
    userConvs.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    onUpdate(userConvs);
  };

  fetchAndPush();

  // In-memory listener for same-tab updates
  localConversationListeners.add(fetchAndPush);

  const handleBroadcast = (e: MessageEvent) => {
    if (
      e.data?.type === 'CONVERSATIONS_UPDATED' ||
      e.data?.type === 'MESSAGES_UPDATED' ||
      e.data?.type === 'USERS_UPDATED' ||
      e.data?.type === 'ALL_DATA_CLEARED'
    ) {
      fetchAndPush();
    }
  };

  chatChannel?.addEventListener('message', handleBroadcast);
  window.addEventListener('storage', fetchAndPush);
  window.addEventListener('connecto_conversations_updated', fetchAndPush);

  return () => {
    unsubFirestore?.();
    localConversationListeners.delete(fetchAndPush);
    chatChannel?.removeEventListener('message', handleBroadcast);
    window.removeEventListener('storage', fetchAndPush);
    window.removeEventListener('connecto_conversations_updated', fetchAndPush);
  };
};

export const subscribeToMessages = (
  conversationId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe => {
  let unsubFirestore: Unsubscribe | null = null;

  if (isFirebaseConfigured && db) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(250));

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const messages: Message[] = [];
          snapshot.forEach((d) => {
            messages.push({ id: d.id, ...d.data() } as Message);
          });
          const local = getLocalMessages(conversationId);
          const map = new Map<string, Message>();
          local.forEach((m) => map.set(m.id, m));
          messages.forEach((m) => map.set(m.id, m));
          const merged = Array.from(map.values());
          merged.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          if (merged.length > 0) {
            saveLocalMessages(conversationId, merged);
            onUpdate(merged);
          }
        },
        (err) => {
          handleFirestoreError(err);
          console.warn('Firestore messages snapshot note:', err);
        }
      );
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore subscribeToMessages note:', err);
    }
  }

  // Local messages listener
  const fetchAndPush = () => {
    const msgs = getLocalMessages(conversationId);
    onUpdate(msgs);
  };

  fetchAndPush();

  // In-memory listener registration for zero-latency local updates
  if (!localMessageListeners.has(conversationId)) {
    localMessageListeners.set(conversationId, new Set());
  }
  const convListeners = localMessageListeners.get(conversationId)!;
  convListeners.add(onUpdate);

  const handleBroadcast = (e: MessageEvent) => {
    if (
      (e.data?.type === 'MESSAGES_UPDATED' && (!e.data.convId || e.data.convId === conversationId)) ||
      e.data?.type === 'ALL_DATA_CLEARED'
    ) {
      fetchAndPush();
    }
  };

  chatChannel?.addEventListener('message', handleBroadcast);
  window.addEventListener('storage', fetchAndPush);

  return () => {
    unsubFirestore?.();
    convListeners.delete(onUpdate);
    if (convListeners.size === 0) {
      localMessageListeners.delete(conversationId);
    }
    chatChannel?.removeEventListener('message', handleBroadcast);
    window.removeEventListener('storage', fetchAndPush);
  };
};

/**
 * Creates a new Group Conversation and persists directly in Firestore + Local Cache
 */
export const createGroupConversation = async (
  creatorId: string,
  creatorName: string,
  groupName: string,
  participantIds: string[],
  options?: {
    groupDescription?: string;
    groupAvatar?: string;
  }
): Promise<Conversation> => {
  const now = Date.now();
  const groupId = `group_${now}_${Math.random().toString(36).substring(2, 8)}`;
  const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));

  const initialUnread: Record<string, number> = {};
  allParticipantIds.forEach((pid) => {
    if (pid !== creatorId) {
      initialUnread[pid] = 1;
    }
  });

  const newGroup: Conversation = {
    id: groupId,
    isGroup: true,
    groupName: groupName.trim(),
    groupDescription: options?.groupDescription?.trim() || '',
    groupAvatar: options?.groupAvatar || '',
    createdBy: creatorId,
    adminIds: [creatorId],
    participantIds: allParticipantIds,
    lastMessage: `${creatorName} created group "${groupName.trim()}"`,
    lastMessageType: 'system',
    lastSenderId: creatorId,
    lastSenderName: creatorName,
    lastMessageAt: now,
    unreadCount: initialUnread,
    typingUsers: {},
    createdAt: now,
    updatedAt: now
  };

  // 1. Save to local conversations
  const convs = getLocalConversations();
  convs.unshift(newGroup);
  saveLocalConversations(convs);

  // 2. Add initial system message to group
  const initialMsg: Message = {
    id: `msg_${now}_init`,
    conversationId: groupId,
    senderId: creatorId,
    senderName: creatorName,
    text: `${creatorName} created group "${groupName.trim()}"`,
    type: 'system',
    delivered: true,
    read: true,
    createdAt: now,
    updatedAt: now
  };
  saveLocalMessages(groupId, [initialMsg]);

  // 3. Sync to Firestore
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const convRef = doc(db, 'conversations', groupId);
      const msgRef = doc(db, 'conversations', groupId, 'messages', initialMsg.id);

      await Promise.all([
        setDoc(convRef, newGroup),
        setDoc(msgRef, initialMsg)
      ]);
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore group creation sync note:', err);
    }
  }

  return newGroup;
};

/**
 * Updates Group details (Name, Description, Avatar) in Firestore and local state
 */
export const updateGroupDetails = async (
  conversationId: string,
  updates: {
    groupName?: string;
    groupDescription?: string;
    groupAvatar?: string;
  }
): Promise<void> => {
  const now = Date.now();
  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);

  if (idx >= 0) {
    convs[idx] = {
      ...convs[idx],
      ...updates,
      updatedAt: now
    };
    saveLocalConversations(convs);
  }

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        ...updates,
        updatedAt: now
      });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore updateGroupDetails note:', err);
    }
  }
};

/**
 * Adds new members to an existing group
 */
export const addGroupMembers = async (
  conversationId: string,
  newMemberIds: string[],
  addedByName: string,
  addedMemberNames: string[]
): Promise<void> => {
  const now = Date.now();
  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);

  if (idx >= 0) {
    const updatedParticipants = Array.from(
      new Set([...(convs[idx].participantIds || []), ...newMemberIds])
    );
    const systemText = `${addedByName} added ${addedMemberNames.join(', ')} to the group`;

    convs[idx] = {
      ...convs[idx],
      participantIds: updatedParticipants,
      lastMessage: systemText,
      lastMessageType: 'system',
      lastMessageAt: now,
      updatedAt: now
    };
    saveLocalConversations(convs);

    // Add system message
    const msgs = getLocalMessages(conversationId);
    const sysMsg: Message = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      senderId: 'system',
      senderName: 'System',
      text: systemText,
      type: 'system',
      delivered: true,
      read: true,
      createdAt: now,
      updatedAt: now
    };
    msgs.push(sysMsg);
    saveLocalMessages(conversationId, msgs);

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const convRef = doc(db, 'conversations', conversationId);
        const msgRef = doc(db, 'conversations', conversationId, 'messages', sysMsg.id);
        await Promise.all([
          updateDoc(convRef, {
            participantIds: updatedParticipants,
            lastMessage: systemText,
            lastMessageType: 'system',
            lastMessageAt: now,
            updatedAt: now
          }),
          setDoc(msgRef, sysMsg)
        ]);
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore addGroupMembers note:', err);
      }
    }
  }
};

/**
 * Removes a member or leaves the group
 */
export const removeGroupMember = async (
  conversationId: string,
  memberId: string,
  memberName: string,
  isSelfLeaving = false
): Promise<void> => {
  const now = Date.now();
  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);

  if (idx >= 0) {
    const updatedParticipants = (convs[idx].participantIds || []).filter((id) => id !== memberId);
    const updatedAdmins = (convs[idx].adminIds || []).filter((id) => id !== memberId);
    const systemText = isSelfLeaving
      ? `${memberName} left the group`
      : `${memberName} was removed from the group`;

    convs[idx] = {
      ...convs[idx],
      participantIds: updatedParticipants,
      adminIds: updatedAdmins,
      lastMessage: systemText,
      lastMessageType: 'system',
      lastMessageAt: now,
      updatedAt: now
    };
    saveLocalConversations(convs);

    const msgs = getLocalMessages(conversationId);
    const sysMsg: Message = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      senderId: 'system',
      senderName: 'System',
      text: systemText,
      type: 'system',
      delivered: true,
      read: true,
      createdAt: now,
      updatedAt: now
    };
    msgs.push(sysMsg);
    saveLocalMessages(conversationId, msgs);

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const convRef = doc(db, 'conversations', conversationId);
        const msgRef = doc(db, 'conversations', conversationId, 'messages', sysMsg.id);
        await Promise.all([
          updateDoc(convRef, {
            participantIds: updatedParticipants,
            adminIds: updatedAdmins,
            lastMessage: systemText,
            lastMessageType: 'system',
            lastMessageAt: now,
            updatedAt: now
          }),
          setDoc(msgRef, sysMsg)
        ]);
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore removeGroupMember note:', err);
      }
    }
  }
};

/**
 * Toggle admin status for a group member
 */
export const toggleGroupAdmin = async (
  conversationId: string,
  targetUserId: string,
  makeAdmin: boolean
): Promise<void> => {
  const now = Date.now();
  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);

  if (idx >= 0) {
    const currentAdmins = new Set(convs[idx].adminIds || []);
    if (makeAdmin) {
      currentAdmins.add(targetUserId);
    } else {
      currentAdmins.delete(targetUserId);
    }
    const adminIds = Array.from(currentAdmins);

    convs[idx] = {
      ...convs[idx],
      adminIds,
      updatedAt: now
    };
    saveLocalConversations(convs);

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          adminIds,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore toggleGroupAdmin note:', err);
      }
    }
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId?: string,
  data?: {
    text?: string;
    type: MessageType;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    videoDuration?: number;
    audioDuration?: number;
    audioWaveform?: number[];
    senderName?: string;
    senderAvatar?: string;
    replyTo?: {
      id: string;
      senderName?: string;
      text?: string;
      type?: MessageType;
      fileUrl?: string;
      stickerEmoji?: string;
    };
  }
): Promise<void> => {
  if (!data) return;
  const now = Date.now();
  const newMsgId = `msg_${now}_${Math.random().toString(36).substring(2, 9)}`;

  // Save locally first for instant, zero-latency rendering
  const msgs = getLocalMessages(conversationId);
  const newMsg: Message = {
    id: newMsgId,
    conversationId,
    senderId,
    receiverId: receiverId || '',
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
    text: data.text || '',
    type: data.type,
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileSize: data.fileSize,
    videoDuration: data.videoDuration,
    audioDuration: data.audioDuration,
    audioWaveform: data.audioWaveform,
    replyTo: data.replyTo,
    delivered: true,
    read: false,
    createdAt: now,
    updatedAt: now
  };
  msgs.push(newMsg);
  saveLocalMessages(conversationId, msgs);

  // Update local conversation
  const convs = getLocalConversations();
  const convIdx = convs.findIndex((c) => c.id === conversationId);
  const summary = data.type === 'text' 
    ? (data.text || '') 
    : data.type === 'image' 
    ? '📷 Photo' 
    : data.type === 'video'
    ? '🎥 Video'
    : data.type === 'sticker'
    ? `🎨 Sticker ${data.text || ''}`
    : `[${data.type.toUpperCase()}]`;

  const unreadUpdates: Record<string, number> = {};
  const firestoreUnreadPayload: Record<string, any> = {};

  if (convIdx >= 0) {
    const existing = convs[convIdx];
    const isGroup = existing.isGroup || false;
    const participants = existing.participantIds || [];

    // Increment unread count for all other members
    participants.forEach((pid) => {
      if (pid !== senderId) {
        const curr = existing.unreadCount?.[pid] || 0;
        unreadUpdates[pid] = curr + 1;
        firestoreUnreadPayload[`unreadCount.${pid}`] = increment(1);
      }
    });

    convs[convIdx] = {
      ...existing,
      participantIds: Array.from(new Set([...participants, senderId])),
      lastMessage: isGroup && data.senderName ? `${data.senderName}: ${summary}` : summary,
      lastMessageType: data.type,
      lastSenderId: senderId,
      lastSenderName: data.senderName,
      lastMessageAt: now,
      updatedAt: now,
      unreadCount: {
        ...(existing.unreadCount || {}),
        ...unreadUpdates
      }
    };
  } else {
    // New 1-on-1 conversation
    const participantIds = receiverId ? [senderId, receiverId] : [senderId];
    if (receiverId) {
      unreadUpdates[receiverId] = 1;
      firestoreUnreadPayload[`unreadCount.${receiverId}`] = increment(1);
    }

    convs.push({
      id: conversationId,
      participantIds,
      lastMessage: summary,
      lastMessageType: data.type,
      lastSenderId: senderId,
      lastSenderName: data.senderName,
      lastMessageAt: now,
      unreadCount: unreadUpdates,
      typingUsers: {},
      createdAt: now,
      updatedAt: now
    });
  }
  saveLocalConversations(convs);

  // Sync to Firestore in the background
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const convRef = doc(db, 'conversations', conversationId);

      const firestoreMsgPayload: any = {
        conversationId,
        senderId,
        senderName: data.senderName || null,
        senderAvatar: data.senderAvatar || null,
        receiverId: receiverId || null,
        text: data.text || '',
        type: data.type,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        videoDuration: data.videoDuration || null,
        replyTo: data.replyTo || null,
        delivered: true,
        read: false,
        createdAt: now,
        updatedAt: now
      };

      const targetConv = convs.find((c) => c.id === conversationId);
      const participantIds = targetConv?.participantIds || (receiverId ? [senderId, receiverId] : [senderId]);

      const firestoreConvPayload: any = {
        id: conversationId,
        participantIds,
        isGroup: targetConv?.isGroup || false,
        groupName: targetConv?.groupName || null,
        lastMessage: summary,
        lastMessageType: data.type,
        lastSenderId: senderId,
        lastSenderName: data.senderName || null,
        lastMessageAt: now,
        updatedAt: now,
        ...firestoreUnreadPayload
      };

      await Promise.all([
        addDoc(messagesRef, firestoreMsgPayload),
        setDoc(convRef, firestoreConvPayload, { merge: true })
      ]);
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore sendMessage sync note:', err);
    }
  }
};

export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`unreadCount.${userId}`]: 0
      });
    } catch (err) {
      handleFirestoreError(err);
      // Non-blocking
    }
  }

  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);
  let convChanged = false;
  if (idx >= 0 && convs[idx].unreadCount?.[userId]) {
    convs[idx].unreadCount![userId] = 0;
    convChanged = true;
  }

  // Mark incoming messages as read
  const msgs = getLocalMessages(conversationId);
  let msgsChanged = false;
  msgs.forEach((m) => {
    if (m.senderId !== userId && !m.read) {
      m.read = true;
      msgsChanged = true;
    }
  });

  if (msgsChanged) {
    saveLocalMessages(conversationId, msgs);
  }
  if (convChanged) {
    saveLocalConversations(convs);
  }
};

export const setTypingStatus = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`typingUsers.${userId}`]: isTyping
      });
      return;
    } catch (err) {
      handleFirestoreError(err);
      // Non-blocking
    }
  }

  const convs = getLocalConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    convs[idx].typingUsers = {
      ...(convs[idx].typingUsers || {}),
      [userId]: isTyping
    };
    saveLocalConversations(convs);
  }
};

export const addMessageReaction = async (
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  const msgs = getLocalMessages(conversationId);
  const msg = msgs.find((m) => m.id === messageId);
  if (msg) {
    if (!msg.reactions) msg.reactions = {};
    if (msg.reactions[userId] === emoji) {
      delete msg.reactions[userId];
    } else {
      msg.reactions[userId] = emoji;
    }
    saveLocalMessages(conversationId, msgs);

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await updateDoc(msgRef, {
          reactions: msg.reactions
        });
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore reaction sync note:', err);
      }
    }
  }
};

/**
 * Delete message for EVERYONE (WhatsApp style - sender can delete their own message for all participants)
 */
export const deleteMessageForEveryone = async (
  conversationId: string,
  messageId: string
): Promise<void> => {
  const now = Date.now();
  const msgs = getLocalMessages(conversationId);
  const targetIdx = msgs.findIndex((m) => m.id === messageId);

  if (targetIdx >= 0) {
    msgs[targetIdx] = {
      ...msgs[targetIdx],
      deletedForEveryone: true,
      text: 'This message was deleted',
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
      reactions: {},
      updatedAt: now
    };
    saveLocalMessages(conversationId, msgs);

    // Update conversation preview if this was the last message
    const convs = getLocalConversations();
    const convIdx = convs.findIndex((c) => c.id === conversationId);
    if (convIdx >= 0) {
      const isLast = convs[convIdx].lastMessageAt === msgs[targetIdx].createdAt || targetIdx === msgs.length - 1;
      if (isLast) {
        convs[convIdx] = {
          ...convs[convIdx],
          lastMessage: 'This message was deleted',
          updatedAt: now
        };
        saveLocalConversations(convs);
      }
    }

    // Sync to Firestore
    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        const convRef = doc(db, 'conversations', conversationId);

        await Promise.all([
          updateDoc(msgRef, {
            deletedForEveryone: true,
            text: 'This message was deleted',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            reactions: {},
            updatedAt: now
          }),
          updateDoc(convRef, {
            lastMessage: 'This message was deleted',
            updatedAt: now
          })
        ]);
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore deleteMessageForEveryone note:', err);
      }
    }
  }
};

/**
 * Delete message for ME ONLY (Hides the message from the current user's device/history)
 */
export const deleteMessageForMe = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  const now = Date.now();
  const msgs = getLocalMessages(conversationId);
  const targetIdx = msgs.findIndex((m) => m.id === messageId);

  if (targetIdx >= 0) {
    const existingUsers = msgs[targetIdx].deletedForUsers || [];
    if (!existingUsers.includes(userId)) {
      msgs[targetIdx] = {
        ...msgs[targetIdx],
        deletedForUsers: [...existingUsers, userId],
        updatedAt: now
      };
      saveLocalMessages(conversationId, msgs);
    }

    // Sync to Firestore
    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        const updatedUsers = Array.from(new Set([...existingUsers, userId]));
        await updateDoc(msgRef, {
          deletedForUsers: updatedUsers,
          updatedAt: now
        });
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore deleteMessageForMe note:', err);
      }
    }
  }
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  // 1. Delete from Firestore if enabled
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, 'conversations', conversationId));
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore deleteConversation note:', err);
    }
  }

  // 2. Remove from local conversations
  const convs = getLocalConversations();
  const updated = convs.filter((c) => c.id !== conversationId);
  saveLocalConversations(updated);

  // 3. Remove local message cache
  safeRemoveItem(`${LOCAL_MESSAGES_KEY}_${conversationId}`);

  chatChannel?.postMessage({ type: 'CONVERSATIONS_UPDATED' });
  chatChannel?.postMessage({ type: 'MESSAGES_UPDATED', convId: conversationId });
};

export const getOrCreateConversation = async (
  userId1: string,
  userId2: string
): Promise<Conversation> => {
  const convs = getLocalConversations();
  const existing = convs.find(
    (c) =>
      !c.isGroup &&
      c.participantIds.includes(userId1) &&
      c.participantIds.includes(userId2)
  );

  if (existing) {
    return existing;
  }

  const id = [userId1, userId2].sort().join('_');
  const now = Date.now();
  const newConv: Conversation = {
    id,
    participantIds: [userId1, userId2],
    createdAt: now,
    updatedAt: now,
    unreadCount: { [userId1]: 0, [userId2]: 0 }
  };

  convs.unshift(newConv);
  saveLocalConversations(convs);

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      await setDoc(doc(db, 'conversations', id), newConv, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore getOrCreateConversation note:', err);
    }
  }

  return newConv;
};

export const getAllConversations = async (): Promise<Conversation[]> => {
  const local = getLocalConversations();
  const mergedMap = new Map<string, Conversation>();
  local.forEach((c) => mergedMap.set(c.id, c));

  if (isFirebaseConfigured && db) {
    try {
      const convsRef = collection(db, 'conversations');
      const snapshot = await getDocs(convsRef);
      snapshot.forEach((d) => {
        const conv = { id: d.id, ...d.data() } as Conversation;
        const existing = mergedMap.get(conv.id);
        mergedMap.set(conv.id, existing ? { ...existing, ...conv } : conv);
      });
    } catch (err) {
      console.warn('Firestore getAllConversations note:', err);
    }
  }

  const merged = purgeFakeConvs(Array.from(mergedMap.values()));
  saveLocalConversations(merged);
  return merged;
};

export const getSystemStats = async (): Promise<{
  totalUsers: number;
  activeNow: number;
  totalMessages: number;
  totalConversations: number;
  storageUsedMb: number;
  uptimeHours: number;
}> => {
  const allUsers = await getAllUsers();
  const convs = getLocalConversations();
  let totalMsgCount = 0;
  convs.forEach((c) => {
    totalMsgCount += getLocalMessages(c.id).length;
  });

  const activeUsers = allUsers.filter((u) => u.isOnline).length;

  return {
    totalUsers: allUsers.length,
    activeNow: activeUsers,
    totalMessages: totalMsgCount,
    totalConversations: convs.length,
    storageUsedMb: Number((totalMsgCount * 0.005 + allUsers.length * 0.01).toFixed(2)),
    uptimeHours: 99.99
  };
};
