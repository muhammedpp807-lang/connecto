import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { UserProfile } from '../types';

const LOCAL_USERS_KEY = 'connecto_db_users';
const LOCAL_USERNAMES_KEY = 'connecto_db_usernames';

// Channel for cross-tab user sync
const userChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('connecto_user_channel')
  : null;

const FAKE_UIDS = new Set([
  'user_bot_connecto',
  'user_sarah_jenkins',
  'user_alex_rivera',
  'user_elena_rostova',
  'user_marcus_vance'
]);

function purgeFakeSeedData(users: UserProfile[]): UserProfile[] {
  return users.filter((u) => {
    if (!u || !u.uid) return false;
    if (FAKE_UIDS.has(u.uid)) return false;
    if (u.username === 'connectobot') return false;
    if (u.uid.startsWith('seed_')) return false;
    return true;
  });
}

function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = purgeFakeSeedData(parsed);
        if (cleaned.length !== parsed.length) {
          saveLocalUsers(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading local users:', err);
  }
  return [];
}

function saveLocalUsers(users: UserProfile[]) {
  try {
    const cleaned = purgeFakeSeedData(users);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(cleaned));
    userChannel?.postMessage({ type: 'USERS_UPDATED' });
  } catch (err) {
    console.error('Error saving local users:', err);
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timed out')), ms)
    )
  ]);
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (FAKE_UIDS.has(uid)) return null;

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Keep local cache fresh
        const users = getLocalUsers();
        const idx = users.findIndex((u) => u.uid === uid);
        if (idx >= 0) users[idx] = data;
        else users.push(data);
        saveLocalUsers(users);
        return data;
      }
    } catch (err) {
      console.warn('Firestore user fetch note:', err);
    }
  }

  const users = getLocalUsers();
  return users.find((u) => u.uid === uid) || null;
};

export const getUserByUsernameOrEmail = async (identifier: string): Promise<UserProfile | null> => {
  const clean = identifier.toLowerCase().trim();
  if (!clean) return null;

  // 1. Check local storage
  const localUsers = getLocalUsers();
  const foundLocal = localUsers.find(
    (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
  );
  if (foundLocal) return foundLocal;

  // 2. Check Firestore
  if (isFirebaseConfigured && db) {
    try {
      // 2a. Check usernames index collection
      const usernameDocRef = doc(db, 'usernames', clean);
      const usernameSnap = await withTimeout(getDoc(usernameDocRef), 2000);
      if (usernameSnap.exists()) {
        const uid = usernameSnap.data()?.uid;
        if (uid) {
          const profile = await getUserProfile(uid);
          if (profile) return profile;
        }
      }

      // 2b. Query users collection by username
      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username', '==', clean), limit(1));
      const usernameSnapshots = await withTimeout(getDocs(usernameQuery), 2500);
      if (!usernameSnapshots.empty) {
        const profile = usernameSnapshots.docs[0].data() as UserProfile;
        if (profile) {
          const users = getLocalUsers();
          if (!users.some((u) => u.uid === profile.uid)) {
            users.push(profile);
            saveLocalUsers(users);
          }
          return profile;
        }
      }

      // 2c. Query users collection by email
      const emailQuery = query(usersRef, where('email', '==', clean), limit(1));
      const emailSnapshots = await withTimeout(getDocs(emailQuery), 2500);
      if (!emailSnapshots.empty) {
        const profile = emailSnapshots.docs[0].data() as UserProfile;
        if (profile) {
          const users = getLocalUsers();
          if (!users.some((u) => u.uid === profile.uid)) {
            users.push(profile);
            saveLocalUsers(users);
          }
          return profile;
        }
      }
    } catch (err) {
      console.warn('Firestore getUserByUsernameOrEmail note:', err);
    }
  }

  return null;
};

export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  const clean = username.toLowerCase().trim();
  if (!clean || clean.length < 3) return false;

  const users = getLocalUsers();
  const localTaken = users.some((u) => u.username.toLowerCase() === clean);
  if (localTaken) return false;

  if (isFirebaseConfigured && db) {
    try {
      const usernameRef = doc(db, 'usernames', clean);
      const snap = await withTimeout(getDoc(usernameRef), 1500);
      return !snap.exists();
    } catch (err) {
      console.warn('Firestore username check note:', err);
    }
  }

  return true;
};

export const createUserProfile = async (profile: UserProfile): Promise<void> => {
  const cleanUsername = profile.username.toLowerCase().trim();

  // Always save locally first so user is never blocked
  const users = getLocalUsers();
  const existingIdx = users.findIndex((u) => u.uid === profile.uid);
  const newProfile: UserProfile = {
    ...profile,
    username: cleanUsername,
    createdAt: profile.createdAt || Date.now(),
    updatedAt: Date.now(),
    isOnline: true,
    lastSeen: Date.now()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = newProfile;
  } else {
    users.push(newProfile);
  }
  saveLocalUsers(users);

  // Sync to Firestore in the background or with timeout
  if (isFirebaseConfigured && db) {
    try {
      await withTimeout(
        Promise.all([
          setDoc(doc(db, 'usernames', cleanUsername), { uid: profile.uid }),
          setDoc(doc(db, 'users', profile.uid), newProfile)
        ]),
        2000
      );
    } catch (err) {
      console.warn('Firestore user creation note:', err);
    }
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  // Always update locally first
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.uid === uid);
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      ...updates,
      updatedAt: Date.now()
    };
    saveLocalUsers(users);
  }

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await withTimeout(
        updateDoc(userRef, {
          ...updates,
          updatedAt: Date.now()
        }),
        2000
      );
    } catch (err) {
      console.warn('Firestore user update note:', err);
    }
  }
};

export const setUserOnlineStatus = async (uid: string, isOnline: boolean): Promise<void> => {
  if (!uid || FAKE_UIDS.has(uid)) return;
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: Date.now()
      });
      return;
    } catch {
      // Non-blocking
    }
  }

  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.uid === uid);
  if (idx >= 0) {
    users[idx].isOnline = isOnline;
    users[idx].lastSeen = Date.now();
    saveLocalUsers(users);
  }
};

export const searchUsers = async (searchTerm: string, currentUid: string): Promise<UserProfile[]> => {
  const clean = searchTerm.toLowerCase().trim();
  const users = getLocalUsers();

  if (!clean) {
    // Return all other real users
    return users.filter((u) => u.uid !== currentUid && !FAKE_UIDS.has(u.uid));
  }

  if (isFirebaseConfigured && db) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', clean),
        where('username', '<=', clean + '\uf8ff'),
        limit(15)
      );
      const snapshot = await withTimeout(getDocs(q), 1500);
      const results: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as UserProfile;
        if (data.uid !== currentUid && !FAKE_UIDS.has(data.uid)) {
          results.push(data);
        }
      });
      if (results.length > 0) return results;
    } catch (err) {
      console.warn('Firestore search note:', err);
    }
  }

  return users.filter((u) => {
    if (u.uid === currentUid || FAKE_UIDS.has(u.uid)) return false;
    const nameMatch = u.displayName.toLowerCase().includes(clean);
    const userMatch = u.username.toLowerCase().includes(clean);
    const emailMatch = u.email.toLowerCase().includes(clean);
    return nameMatch || userMatch || emailMatch;
  });
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const local = getLocalUsers();
  if (isFirebaseConfigured && db) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await withTimeout(getDocs(usersRef), 2000);
      const results: UserProfile[] = [];
      snapshot.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u && u.uid && !FAKE_UIDS.has(u.uid)) {
          results.push(u);
        }
      });
      if (results.length > 0) {
        saveLocalUsers(results);
        return results;
      }
    } catch (err) {
      console.warn('Firestore getAllUsers note:', err);
    }
  }
  return local;
};

export const lockUser = async (uid: string, isLocked: boolean): Promise<void> => {
  await updateUserProfile(uid, { isLocked });
  userChannel?.postMessage({ type: 'USERS_UPDATED' });
};

export const deleteUser = async (uid: string): Promise<void> => {
  const users = getLocalUsers();
  const target = users.find((u) => u.uid === uid);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', uid));
      if (target?.username) {
        await deleteDoc(doc(db, 'usernames', target.username.toLowerCase()));
      }
    } catch (err) {
      console.warn('Firestore deleteUser fallback:', err);
    }
  }

  const filtered = users.filter((u) => u.uid !== uid);
  saveLocalUsers(filtered);

  // Clean up credentials
  try {
    const rawCreds = localStorage.getItem('connecto_db_credentials');
    if (rawCreds) {
      const creds = JSON.parse(rawCreds);
      if (target?.username) delete creds[target.username.toLowerCase()];
      if (target?.email) delete creds[target.email.toLowerCase()];
      localStorage.setItem('connecto_db_credentials', JSON.stringify(creds));
    }
  } catch (err) {
    console.error('Error removing user credentials:', err);
  }

  // Clean up conversations where this user participated
  try {
    const rawConvs = localStorage.getItem('connecto_db_conversations');
    if (rawConvs) {
      const convs = JSON.parse(rawConvs);
      if (Array.isArray(convs)) {
        const updatedConvs = convs
          .map((c: any) => {
            if (c.participantIds && c.participantIds.includes(uid)) {
              return {
                ...c,
                participantIds: c.participantIds.filter((p: string) => p !== uid),
                adminIds: (c.adminIds || []).filter((a: string) => a !== uid)
              };
            }
            return c;
          })
          .filter((c: any) => !c.isGroup || (c.participantIds && c.participantIds.length > 0));

        localStorage.setItem('connecto_db_conversations', JSON.stringify(updatedConvs));
      }
    }
  } catch (err) {
    console.error('Error updating conversations on user deletion:', err);
  }

  // If deleted user is current active session
  try {
    const rawSession = localStorage.getItem('connecto_session_user');
    if (rawSession) {
      const sess = JSON.parse(rawSession);
      if (sess.uid === uid) {
        localStorage.removeItem('connecto_session_user');
      }
    }
  } catch (err) {
    console.error('Error checking active session:', err);
  }

  userChannel?.postMessage({ type: 'USERS_UPDATED' });
};

export const deleteAllUsers = async (): Promise<void> => {
  localStorage.removeItem(LOCAL_USERS_KEY);
  localStorage.removeItem(LOCAL_USERNAMES_KEY);
  localStorage.removeItem('connecto_db_credentials');
  localStorage.removeItem('connecto_db_conversations');
  // Clear any message keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('connecto_db_messages_') || key.startsWith('connecto_db_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  userChannel?.postMessage({ type: 'ALL_DATA_CLEARED' });
};

export const addContact = async (userId: string, contactId: string): Promise<void> => {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  const contacts = new Set(profile.contacts || []);
  contacts.add(contactId);
  await updateUserProfile(userId, { contacts: Array.from(contacts) });
};

export const removeContact = async (userId: string, contactId: string): Promise<void> => {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  const contacts = (profile.contacts || []).filter((id) => id !== contactId);
  await updateUserProfile(userId, { contacts });
};


