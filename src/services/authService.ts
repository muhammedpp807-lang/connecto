import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { UserProfile } from '../types';
import { 
  checkUsernameAvailable, 
  createUserProfile, 
  getUserProfile, 
  setUserOnlineStatus, 
  updateUserProfile 
} from './userService';

const CURRENT_USER_SESSION_KEY = 'connecto_session_user';
const CREDENTIALS_KEY = 'connecto_db_credentials';

const FAKE_UIDS = new Set([
  'user_bot_connecto',
  'user_sarah_jenkins',
  'user_alex_rivera',
  'user_elena_rostova',
  'user_marcus_vance'
]);

export interface RegisterParams {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginParams {
  emailOrUsername: string;
  password: string;
}

function getCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return {};
  }
  return {};
}

function saveCredential(identifier: string, pass: string) {
  try {
    const creds = getCredentials();
    creds[identifier.toLowerCase().trim()] = pass;
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('Error saving credential:', err);
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase auth timeout')), ms)
    )
  ]);
}

export const registerUser = async (params: RegisterParams): Promise<UserProfile> => {
  const { displayName, username, email, password } = params;
  const cleanUser = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  const isAvailable = await checkUsernameAvailable(cleanUser);
  if (!isAvailable) {
    throw new Error('This username is already taken. Please choose another one.');
  }

  let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (isFirebaseConfigured && auth) {
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, cleanEmail, password),
        2500
      );
      uid = userCredential.user.uid;
      withTimeout(updateProfile(userCredential.user, { displayName }), 1500).catch(() => {});
    } catch (err: unknown) {
      console.warn('Firebase Auth registration note:', err);
      const fbErr = err as { code?: string; message?: string };
      if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in instead.');
      }
    }
  }

  const newProfile: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: displayName.trim(),
    username: cleanUser,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUser}`,
    about: 'Hey there! I am using Connecto.',
    isOnline: true,
    lastSeen: Date.now(),
    role: cleanEmail.includes('admin') || cleanUser === 'admin' || cleanUser === 'connecto' || cleanEmail.startsWith('connecto@') ? 'admin' : 'user',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await createUserProfile(newProfile);
  saveCredential(cleanUser, password);
  saveCredential(cleanEmail, password);

  localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(newProfile));
  return newProfile;
};

export const loginUser = async (params: LoginParams): Promise<UserProfile> => {
  const { emailOrUsername, password } = params;
  const cleanInput = emailOrUsername.toLowerCase().trim();

  // Special Admin Authentication: connecto / M#@7,2.3/!pp
  if (
    (cleanInput === 'connecto' || cleanInput === 'connecto@connecto.app') &&
    password === 'M#@7,2.3/!pp'
  ) {
    let adminProfile = await getUserProfile('admin_connecto_super');
    if (!adminProfile) {
      adminProfile = {
        uid: 'admin_connecto_super',
        email: 'connecto@connecto.app',
        displayName: 'Connecto Admin',
        username: 'connecto',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=connecto-admin',
        about: 'Official Connecto Platform Administrator',
        isOnline: true,
        lastSeen: Date.now(),
        role: 'admin',
        isLocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await createUserProfile(adminProfile);
      saveCredential('connecto', 'M#@7,2.3/!pp');
      saveCredential('connecto@connecto.app', 'M#@7,2.3/!pp');
    } else {
      adminProfile.role = 'admin';
      adminProfile.isOnline = true;
      await updateUserProfile(adminProfile.uid, { role: 'admin', isOnline: true });
    }

    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(adminProfile));
    return adminProfile;
  }

  // 1. Check local accounts
  const rawUsers = localStorage.getItem('connecto_db_users');
  let users: UserProfile[] = [];
  if (rawUsers) {
    try {
      users = JSON.parse(rawUsers);
    } catch {
      users = [];
    }
  }

  // Clean out any fake seed users
  users = users.filter((u) => u && !FAKE_UIDS.has(u.uid) && !u.uid.startsWith('seed_'));

  const matchedUser = users.find(
    (u) => u.email.toLowerCase() === cleanInput || u.username.toLowerCase() === cleanInput
  );

  if (matchedUser) {
    const creds = getCredentials();
    const storedPass = creds[matchedUser.username.toLowerCase()] || creds[matchedUser.email.toLowerCase()];
    if (storedPass && storedPass !== password) {
      throw new Error('Incorrect password. Please check your password and try again.');
    }

    setUserOnlineStatus(matchedUser.uid, true).catch(() => {});
    matchedUser.isOnline = true;
    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(matchedUser));
    return matchedUser;
  }

  // 2. If Firebase is active and user provided email, try Firebase with a short 1s timeout
  if (isFirebaseConfigured && auth && cleanInput.includes('@')) {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(auth, cleanInput, password),
        1000
      );
      let profile = await getUserProfile(userCredential.user.uid);
      if (!profile) {
        const autoUsername = cleanInput.split('@')[0].replace(/[^a-z0-9_]/g, '');
        profile = {
          uid: userCredential.user.uid,
          email: cleanInput,
          displayName: userCredential.user.displayName || autoUsername,
          username: autoUsername,
          photoURL: userCredential.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${autoUsername}`,
          about: 'Hey there! I am using Connecto.',
          isOnline: true,
          lastSeen: Date.now(),
          role: cleanInput.includes('admin') ? 'admin' : 'user',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await createUserProfile(profile);
      }
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(profile));
      return profile;
    } catch {
      // If Firebase sign-in failed/timed out, fall through to account not found
    }
  }

  throw new Error('No account found with this email or username. Please click "Create account free" below to sign up.');
};

export const logoutUser = async (uid?: string): Promise<void> => {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
  if (uid && !FAKE_UIDS.has(uid)) {
    setUserOnlineStatus(uid, false).catch(() => {});
  }
  if (isFirebaseConfigured && auth) {
    try {
      fbSignOut(auth).catch(() => {});
    } catch {
      // ignore
    }
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  if (isFirebaseConfigured && auth) {
    await sendPasswordResetEmail(auth, email);
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
};

export const getSavedSessionUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (raw) {
      const user: UserProfile = JSON.parse(raw);
      if (user && user.uid && !FAKE_UIDS.has(user.uid) && !user.uid.startsWith('seed_') && user.username !== 'connectobot') {
        return user;
      }
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    }
  } catch {
    return null;
  }
  return null;
};

