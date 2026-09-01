import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { StatusItem, StatusViewer, UserStatusGroup, StatusExpiryOption } from '../types';
import { safeGetItem, safeSetItem, isFirestoreQuotaExhausted, handleFirestoreError } from './storageEngine';

const LOCAL_STATUSES_KEY = 'connecto_db_statuses';

const statusChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('connecto_status_channel')
  : null;

/**
 * Calculate expiry timestamp from user-chosen option
 * 0 indicates "Never expires" (Permanent)
 */
export function calculateExpiresAt(option: StatusExpiryOption | string): number {
  const now = Date.now();
  switch (option) {
    case '1h':
      return now + 1 * 60 * 60 * 1000;
    case '6h':
      return now + 6 * 60 * 60 * 1000;
    case '12h':
      return now + 12 * 60 * 60 * 1000;
    case '24h':
      return now + 24 * 60 * 60 * 1000;
    case '48h':
      return now + 48 * 60 * 60 * 1000;
    case '7d':
      return now + 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now + 30 * 24 * 60 * 60 * 1000;
    case 'never':
      return 0; // 0 = Never / Permanent
    default:
      return now + 24 * 60 * 60 * 1000;
  }
}

/**
 * Format remaining time until status expiration in human readable form
 */
export function formatStatusTimeRemaining(expiresAt: number): string {
  if (!expiresAt || expiresAt === 0) {
    return 'Never expires (Permanent)';
  }
  const now = Date.now();
  if (expiresAt <= now) {
    return 'Expired';
  }
  const diff = expiresAt - now;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 1) {
    return `Expires in ${days} days`;
  }
  if (days === 1) {
    return `Expires in 1 day ${hours}h`;
  }
  if (hours >= 1) {
    return `Expires in ${hours}h ${mins}m`;
  }
  return `Expires in ${Math.max(1, mins)}m`;
}

function getLocalStatuses(): StatusItem[] {
  try {
    const raw = safeGetItem<StatusItem[]>(LOCAL_STATUSES_KEY);
    if (!raw) return [];
    const items: StatusItem[] = Array.isArray(raw) ? raw : [];
    const now = Date.now();
    // Filter out expired (s.expiresAt === 0 means NEVER expires)
    return items.filter((s) => s && (s.expiresAt === 0 || s.expiresAt > now));
  } catch {
    return [];
  }
}

function saveLocalStatuses(items: StatusItem[]): void {
  try {
    const now = Date.now();
    const valid = items.filter((s) => s && (s.expiresAt === 0 || s.expiresAt > now));
    safeSetItem(LOCAL_STATUSES_KEY, valid);
    statusChannel?.postMessage({ type: 'STATUS_UPDATED', timestamp: Date.now() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connecto_status_updated'));
    }
  } catch (err) {
    console.error('Failed to save local statuses:', err);
  }
}

function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Post a new Status (Video, Photo, or Text) with instant optimistic update
 */
export async function createStatus(
  statusData: Omit<StatusItem, 'id' | 'createdAt' | 'expiresAt' | 'viewers'> & {
    expiresAt?: number;
    expiryOption?: StatusExpiryOption;
  }
): Promise<StatusItem> {
  const id = `status_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  const expiryOption = statusData.expiryOption || '24h';
  const expiresAt = statusData.expiresAt !== undefined 
    ? statusData.expiresAt 
    : calculateExpiresAt(expiryOption);

  const newStatus: StatusItem = {
    ...statusData,
    id,
    createdAt: now,
    expiresAt,
    expiryOption,
    viewers: []
  };

  // 1. Save locally INSTANTLY (<1ms)
  const current = getLocalStatuses();
  current.unshift(newStatus);
  saveLocalStatuses(current);

  // 2. Save to Firestore asynchronously without blocking local UI
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const sanitized = sanitizeForFirestore(newStatus);
      await setDoc(doc(db, 'statuses', id), sanitized);
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore createStatus note:', err);
    }
  }

  return newStatus;
}

/**
 * Update the expiration time for an existing status
 */
export async function updateStatusExpiry(
  statusId: string,
  newExpiresAt: number,
  expiryOption?: StatusExpiryOption
): Promise<void> {
  const local = getLocalStatuses();
  const updated = local.map((s) => {
    if (s.id === statusId) {
      return { ...s, expiresAt: newExpiresAt, expiryOption: expiryOption || s.expiryOption };
    }
    return s;
  });

  saveLocalStatuses(updated);

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const statusRef = doc(db, 'statuses', statusId);
      await setDoc(statusRef, { 
        expiresAt: newExpiresAt, 
        expiryOption: expiryOption || null 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore updateStatusExpiry note:', err);
    }
  }
}

/**
 * Subscribe to all active statuses in real time
 */
export function subscribeToStatuses(
  currentUserId: string,
  callback: (statusGroups: UserStatusGroup[]) => void
): () => void {
  let isUnsubscribed = false;

  const emitGroups = (statuses: StatusItem[]) => {
    const now = Date.now();
    // Keep statuses that are permanent (0) or not yet expired
    const active = statuses.filter((s) => s && (s.expiresAt === 0 || s.expiresAt > now));

    // Group by userId
    const groupMap = new Map<string, UserStatusGroup>();

    for (const item of active) {
      if (!groupMap.has(item.userId)) {
        groupMap.set(item.userId, {
          userId: item.userId,
          userName: item.userName,
          userAvatar: item.userAvatar,
          userUsername: item.userUsername,
          statuses: [],
          hasUnseen: false,
          lastUpdated: item.createdAt
        });
      }

      const group = groupMap.get(item.userId)!;
      group.statuses.push(item);
      if (item.createdAt > group.lastUpdated) {
        group.lastUpdated = item.createdAt;
      }
    }

    // Sort statuses within each group chronologically
    const groups = Array.from(groupMap.values()).map((g) => {
      g.statuses.sort((a, b) => a.createdAt - b.createdAt);
      // Determine if there are unseen items for currentUserId
      g.hasUnseen = g.statuses.some((s) => {
        if (s.userId === currentUserId) return false;
        return !s.viewers?.some((v) => v.userId === currentUserId);
      });
      return g;
    });

    // Sort groups: own group first, then unseen groups, then seen groups
    groups.sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return b.lastUpdated - a.lastUpdated;
    });

    callback(groups);
  };

  // Immediate emit from local storage (<1ms)
  emitGroups(getLocalStatuses());

  // Listen to BroadcastChannel and window events for instant local updates
  const handleMessage = () => {
    if (!isUnsubscribed) {
      emitGroups(getLocalStatuses());
    }
  };
  statusChannel?.addEventListener('message', handleMessage);
  if (typeof window !== 'undefined') {
    window.addEventListener('connecto_status_updated', handleMessage);
    window.addEventListener('storage', handleMessage);
  }

  // If Firebase is configured, subscribe to Firestore statuses
  let firestoreUnsub: Unsubscribe | null = null;
  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    try {
      const q = collection(db, 'statuses');

      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          const remoteItems: StatusItem[] = [];
          const now = Date.now();
          snapshot.forEach((doc) => {
            const data = doc.data() as StatusItem;
            if (data && data.id && (data.expiresAt === 0 || data.expiresAt > now)) {
              remoteItems.push(data);
            }
          });

          // Merge with local
          const localItems = getLocalStatuses();
          const map = new Map<string, StatusItem>();
          localItems.forEach((s) => map.set(s.id, s));
          remoteItems.forEach((s) => map.set(s.id, s));

          const merged = Array.from(map.values());
          saveLocalStatuses(merged);
          emitGroups(merged);
        },
        (err) => {
          handleFirestoreError(err);
          console.warn('Firestore status subscription error:', err);
        }
      );
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Firestore status query error:', err);
    }
  }

  return () => {
    isUnsubscribed = true;
    statusChannel?.removeEventListener('message', handleMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('connecto_status_updated', handleMessage);
      window.removeEventListener('storage', handleMessage);
    }
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

/**
 * Mark a status as viewed by a user
 */
export async function markStatusAsViewed(
  statusId: string,
  viewer: { userId: string; userName: string; userAvatar?: string }
): Promise<void> {
  const local = getLocalStatuses();
  let updated = false;

  const newLocal = local.map((s) => {
    if (s.id === statusId) {
      const viewers = s.viewers || [];
      if (!viewers.some((v) => v.userId === viewer.userId)) {
        updated = true;
        const newViewer: StatusViewer = {
          userId: viewer.userId,
          userName: viewer.userName,
          userAvatar: viewer.userAvatar,
          viewedAt: Date.now()
        };
        return { ...s, viewers: [...viewers, newViewer] };
      }
    }
    return s;
  });

  if (updated) {
    saveLocalStatuses(newLocal);

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const statusRef = doc(db, 'statuses', statusId);
        const targetStatus = newLocal.find((s) => s.id === statusId);
        if (targetStatus) {
          await setDoc(statusRef, { viewers: targetStatus.viewers }, { merge: true });
        }
      } catch (err) {
        handleFirestoreError(err);
        console.warn('Firestore markStatusAsViewed note:', err);
      }
    }
  }
}

/**
 * Delete a status item permanently with instant optimistic local removal
 */
export async function deleteStatus(statusId: string): Promise<void> {
  const local = getLocalStatuses();
  const filtered = local.filter((s) => s.id !== statusId);
  saveLocalStatuses(filtered);

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    deleteDoc(doc(db, 'statuses', statusId)).catch((err) => {
      handleFirestoreError(err);
      console.warn('Firestore deleteStatus note:', err);
    });
  }
}

/**
 * Delete all statuses for a specific user
 */
export async function deleteAllUserStatuses(userId: string): Promise<void> {
  const local = getLocalStatuses();
  const toDelete = local.filter((s) => s.userId === userId);
  const remaining = local.filter((s) => s.userId !== userId);
  saveLocalStatuses(remaining);

  if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
    toDelete.forEach((s) => {
      deleteDoc(doc(db, 'statuses', s.id)).catch((err) => {
        handleFirestoreError(err);
      });
    });
  }
}
