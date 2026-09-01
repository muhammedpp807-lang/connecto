import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  disableNetwork,
  setLogLevel,
  Firestore 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

// Silence Firestore internal console log spam (backoff delay notices, quota retries)
try {
  setLogLevel('silent');
} catch {}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: any;
let authInstance: any;
let dbInstance: Firestore | null = null;
let storageInstance: any;

export const disableFirestoreNetwork = async (): Promise<void> => {
  // Gracefully no-op to allow real-time listeners and multi-device communication
};

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    
    // Initialize Firestore with robust multi-tab offline cache and proper database ID
    const dbId = (appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)') 
      ? appletConfig.firestoreDatabaseId 
      : undefined;

    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);

    storageInstance = getStorage(app);
  } catch (err) {
    console.warn('Firebase init error, fallback to offline local engine:', err);
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export default app;
