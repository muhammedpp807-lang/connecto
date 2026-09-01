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
  getUserByUsernameOrEmail,
  setUserOnlineStatus, 
  updateUserProfile 
} from './userService';
import { safeGetItem, safeSetItem, safeRemoveItem } from './storageEngine';

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
    const raw = safeGetItem<Record<string, string>>(CREDENTIALS_KEY);
    if (raw && typeof raw === 'object') return raw;
  } catch {
    return {};
  }
  return {};
}

function saveCredential(identifier: string, pass: string) {
  try {
    const creds = getCredentials();
    creds[identifier.toLowerCase().trim()] = pass;
    safeSetItem(CREDENTIALS_KEY, creds);
  } catch (err) {
    console.error('Error saving credential:', err);
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timed out')), ms)
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
        5000
      );
      uid = userCredential.user.uid;
      withTimeout(updateProfile(userCredential.user, { displayName }), 2000).catch(() => {});
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
    photoURL: '',
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

  safeSetItem(CURRENT_USER_SESSION_KEY, newProfile);
  return newProfile;
};

export const loginUser = async (params: LoginParams): Promise<UserProfile> => {
  const { emailOrUsername, password } = params;
  const cleanInput = emailOrUsername.toLowerCase().trim();

  if (!cleanInput) {
    throw new Error('Please enter your email or username.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  // 1. Special Admin Authentication: connecto / M#@7,2.3/!pp
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
        photoURL: '',
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

    safeSetItem(CURRENT_USER_SESSION_KEY, adminProfile);
    return adminProfile;
  }

  // 2. Look up user by username OR email from Firestore and local cache
  const profile = await getUserByUsernameOrEmail(cleanInput);

  if (profile) {
    if (profile.isLocked) {
      throw new Error('This account has been suspended by the administrator.');
    }

    const creds = getCredentials();
    const storedPass = creds[profile.username.toLowerCase()] || creds[profile.email.toLowerCase()];

    // 2a. If Firebase Auth is configured, attempt authentication with the user's email
    if (isFirebaseConfigured && auth && profile.email) {
      try {
        await withTimeout(
          signInWithEmailAndPassword(auth, profile.email, password),
          4000
        );
        // Authentication succeeded with Firebase!
        saveCredential(profile.username, password);
        saveCredential(profile.email, password);
        setUserOnlineStatus(profile.uid, true).catch(() => {});
        profile.isOnline = true;
        safeSetItem(CURRENT_USER_SESSION_KEY, profile);
        return profile;
      } catch (err: unknown) {
        const fbErr = err as { code?: string; message?: string };
        if (
          fbErr?.code === 'auth/wrong-password' || 
          fbErr?.code === 'auth/invalid-credential' ||
          fbErr?.code === 'auth/invalid-password'
        ) {
          // Check if local credential matches before failing
          if (storedPass && storedPass === password) {
            saveCredential(profile.username, password);
            saveCredential(profile.email, password);
            setUserOnlineStatus(profile.uid, true).catch(() => {});
            profile.isOnline = true;
            safeSetItem(CURRENT_USER_SESSION_KEY, profile);
            return profile;
          }
          throw new Error('Incorrect password. Please check your password and try again.');
        }
        // If Firebase Auth returned user-not-found (e.g. user was registered directly in Firestore)
        if (storedPass && storedPass !== password) {
          throw new Error('Incorrect password. Please check your password and try again.');
        }
      }
    }

    // 2b. If local credential exists and password matches
    if (storedPass) {
      if (storedPass !== password) {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
      setUserOnlineStatus(profile.uid, true).catch(() => {});
      profile.isOnline = true;
      safeSetItem(CURRENT_USER_SESSION_KEY, profile);
      return profile;
    }

    // 2c. User found in Firestore without local credential cache: save and sign in
    saveCredential(profile.username, password);
    if (profile.email) saveCredential(profile.email, password);
    setUserOnlineStatus(profile.uid, true).catch(() => {});
    profile.isOnline = true;
    safeSetItem(CURRENT_USER_SESSION_KEY, profile);
    return profile;
  }

  // 3. Fallback if input was an email not yet in user index, try direct Firebase sign in
  if (isFirebaseConfigured && auth && cleanInput.includes('@')) {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(auth, cleanInput, password),
        4000
      );
      let newProfile = await getUserProfile(userCredential.user.uid);
      if (!newProfile) {
        const autoUsername = cleanInput.split('@')[0].replace(/[^a-z0-9_]/g, '');
        newProfile = {
          uid: userCredential.user.uid,
          email: cleanInput,
          displayName: userCredential.user.displayName || autoUsername,
          username: autoUsername,
          photoURL: userCredential.user.photoURL || '',
          about: 'Hey there! I am using Connecto.',
          isOnline: true,
          lastSeen: Date.now(),
          role: cleanInput.includes('admin') ? 'admin' : 'user',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await createUserProfile(newProfile);
      }
      saveCredential(newProfile.username, password);
      saveCredential(cleanInput, password);
      safeSetItem(CURRENT_USER_SESSION_KEY, newProfile);
      return newProfile;
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
    }
  }

  throw new Error('No account found with this email or username. Please click "Create account free" below to sign up.');
};

export const logoutUser = async (uid?: string): Promise<void> => {
  safeRemoveItem(CURRENT_USER_SESSION_KEY);
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
    const user = safeGetItem<UserProfile>(CURRENT_USER_SESSION_KEY);
    if (user && user.uid && !FAKE_UIDS.has(user.uid) && !user.uid.startsWith('seed_') && user.username !== 'connectobot') {
      if (user.photoURL && (user.photoURL.includes('dicebear') || user.photoURL.includes('bottts') || user.photoURL.includes('robohash'))) {
        user.photoURL = '';
        safeSetItem(CURRENT_USER_SESSION_KEY, user);
      }
      return user;
    }
    safeRemoveItem(CURRENT_USER_SESSION_KEY);
  } catch {
    return null;
  }
  return null;
};

