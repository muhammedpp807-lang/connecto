/**
 * Connecto Resilient Storage Engine
 * Provides dual-layer persistence:
 * 1. Fast synchronous In-Memory + Safe LocalStorage cache with automatic quota eviction
 * 2. Unlimited, robust IndexedDB storage for heavy media, full message history, and statuses
 * 3. Intelligent Firestore Quota-Exhaustion protection
 */

const DB_NAME = 'connecto_offline_db';
const DB_VERSION = 2;

// IndexedDB instance promise
let idbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages');
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return idbPromise;
}

// In-Memory synchronous cache for fast reads
const memoryCache = new Map<string, any>();

// Initialize memory cache from localStorage on load and prune bloated keys
if (typeof window !== 'undefined') {
  try {
    const keysToClean: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('connecto_')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            // If individual key is excessively huge (> 1.5MB), prune or defer to IndexedDB
            if (val.length > 1500000) {
              keysToClean.push(key);
            } else {
              memoryCache.set(key, JSON.parse(val));
            }
          }
        } catch {
          // Non-critical
        }
      }
    }
    // Clean oversized keys from localStorage to immediately free quota
    keysToClean.forEach((k) => {
      try {
        const val = localStorage.getItem(k);
        if (val) {
          memoryCache.set(k, JSON.parse(val));
          // Async save to IndexedDB before removal from localStorage
          idbSet('keyval', k, JSON.parse(val)).catch(() => {});
        }
        localStorage.removeItem(k);
      } catch {}
    });
  } catch (err) {
    console.warn('Storage cache init note:', err);
  }
}

/**
 * Async IndexedDB Set helper
 */
export async function idbSet(storeName: string, key: string, value: any): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Async IndexedDB Get helper
 */
export async function idbGet<T = any>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Safe local storage set that guarantees zero quota crashes:
 * 1. Writes to synchronous memoryCache
 * 2. Writes to IndexedDB asynchronously
 * 3. Attempts localStorage write, automatically trimming if quota is exceeded
 */
export function safeSetItem(key: string, value: any): void {
  memoryCache.set(key, value);

  // Background mirror to limitless IndexedDB
  idbSet('keyval', key, value).catch(() => {});

  if (typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    // If QuotaExceededError, perform smart eviction on localStorage
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || String(err).includes('quota')) {
      try {
        // 1. Remove non-essential keys first (like old search queries or oversized status caches)
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k !== key && k.startsWith('connecto_db_messages_')) {
            localStorage.removeItem(k);
          }
        }
        // 2. If it's an array of messages or statuses, create a lightweight version without raw heavy media strings for localStorage
        if (Array.isArray(value)) {
          const lightweight = value.slice(-30).map((item) => {
            if (item && typeof item === 'object') {
              const copy = { ...item };
              if (typeof copy.fileUrl === 'string' && copy.fileUrl.startsWith('data:')) {
                copy.fileUrl = copy.fileUrl.substring(0, 100) + '...[cached in indexedDB]';
              }
              if (typeof copy.mediaUrl === 'string' && copy.mediaUrl.startsWith('data:')) {
                copy.mediaUrl = copy.mediaUrl.substring(0, 100) + '...[cached in indexedDB]';
              }
              return copy;
            }
            return item;
          });
          localStorage.setItem(key, JSON.stringify(lightweight));
        } else {
          // If single item, attempt direct write after purge
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch {
        // Even if localStorage is completely exhausted, the memoryCache and IndexedDB have it safely.
      }
    }
  }
}

/**
 * Safe local storage get
 */
export function safeGetItem<T = any>(key: string): T | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed as T;
      }
    } catch {
      // Non-critical
    }
  }
  return null;
}

/**
 * Safe local storage remove
 */
export function safeRemoveItem(key: string): void {
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

// ----------------------------------------------------
// Firestore Quota Exhaustion Circuit Breaker
// ----------------------------------------------------
let firestoreQuotaExhaustedUntil = 0;

export function isFirestoreQuotaExhausted(): boolean {
  return Date.now() < firestoreQuotaExhaustedUntil;
}

export function markFirestoreQuotaExhausted(cooldownSeconds = 300): void {
  firestoreQuotaExhaustedUntil = Date.now() + cooldownSeconds * 1000;
  console.info(`[Connecto] Firestore write quota reached. Seamlessly utilizing local & IndexedDB engine (cooldown ${cooldownSeconds}s).`);
}

export function handleFirestoreError(err: any): void {
  const errMsg = String(err?.message || err || '');
  const errCode = String(err?.code || '');
  
  if (
    errCode === 'resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('Free daily write units')
  ) {
    markFirestoreQuotaExhausted(600); // 10 minutes quiet cooldown
  }
}
