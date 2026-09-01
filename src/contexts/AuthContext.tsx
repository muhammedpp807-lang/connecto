import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { UserProfile } from '../types';
import { 
  getSavedSessionUser, 
  loginUser, 
  logoutUser, 
  registerUser, 
  LoginParams, 
  RegisterParams 
} from '../services/authService';
import { getUserProfile, setUserOnlineStatus, updateUserProfile, sendUserHeartbeat } from '../services/userService';
import { safeSetItem, safeRemoveItem } from '../services/storageEngine';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (params: LoginParams) => Promise<UserProfile>;
  register: (params: RegisterParams) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAndSetProfile = useCallback(async (uid: string) => {
    try {
      const p = await getUserProfile(uid);
      if (p) {
        setProfile(p);
        safeSetItem('connecto_session_user', p);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  useEffect(() => {
    // Check saved session
    const saved = getSavedSessionUser();
    if (saved) {
      setProfile(saved);
      sendUserHeartbeat(saved.uid);
    }

    let unsubscribe = () => {};

    if (isFirebaseConfigured && auth) {
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setCurrentUser(fbUser);
        if (fbUser) {
          await fetchAndSetProfile(fbUser.uid);
          await sendUserHeartbeat(fbUser.uid);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, [fetchAndSetProfile]);

  // Active presence heartbeat loop & tab visibility lifecycle
  useEffect(() => {
    if (!profile?.uid) return;
    const uid = profile.uid;

    // Send immediate heartbeat on mount/change
    sendUserHeartbeat(uid);

    // Heartbeat every 15 seconds to keep lastSeen fresh
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendUserHeartbeat(uid);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendUserHeartbeat(uid);
      } else {
        // Tab hidden or backgrounded
        setUserOnlineStatus(uid, false);
      }
    };

    const handleFocus = () => {
      sendUserHeartbeat(uid);
    };

    const handleBlur = () => {
      // Don't immediately mark offline on brief blur, but handle pagehide
    };

    const handlePageHide = () => {
      setUserOnlineStatus(uid, false);
    };

    const handleBeforeUnload = () => {
      setUserOnlineStatus(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile?.uid]);

  const login = async (params: LoginParams) => {
    setLoading(true);
    try {
      const user = await loginUser(params);
      setProfile(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (params: RegisterParams) => {
    setLoading(true);
    try {
      const user = await registerUser(params);
      setProfile(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const uid = profile?.uid;
    setProfile(null);
    setCurrentUser(null);
    safeRemoveItem('connecto_session_user');
    logoutUser(uid).catch(() => {});
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    await updateUserProfile(profile.uid, updates);
    const updated = { ...profile, ...updates, updatedAt: Date.now() };
    setProfile(updated);
    safeSetItem('connecto_session_user', updated);
  };

  const refreshProfile = async () => {
    if (profile?.uid) {
      await fetchAndSetProfile(profile.uid);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.username === 'connecto' || profile?.username === 'admin' || profile?.email === 'connecto@connecto.app' || profile?.email === 'admin@connecto.app';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAdmin,
        login,
        register,
        logout,
        updateProfileData,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
