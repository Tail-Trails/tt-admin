import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { BASE_URL } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: { email: string } | null;
  login: (token: string, email: string) => void;
  logout: () => void;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function initFirebaseAppIfNeeded() {
  if (!getApps().length) {
    // Read essential Firebase config from Vite env vars.
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    } as Record<string, string | undefined>;

    // Minimal guard: apiKey and authDomain required for auth popup to work.
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) return;

    initializeApp(firebaseConfig as Record<string, string>);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    (() => {
      try {
        return localStorage.getItem('access_token');
      } catch (e) {
        return null;
      }
    })()
  );

  const [user, setUser] = useState<{ email: string } | null>(() => {
    try {
      const email = localStorage.getItem('user_email');
      return email ? { email } : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    initFirebaseAppIfNeeded();

    try {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
        if (fbUser) {
          // getIdToken returns a Firebase ID token (JWT). We must not overwrite
          // any existing backend `access_token` with the Firebase token on page
          // refresh. Store the Firebase token separately and prefer the stored
          // backend token if present.
          const idToken = await fbUser.getIdToken();
          try {
            localStorage.setItem('firebase_id_token', idToken);
            localStorage.setItem('user_email', fbUser.email ?? '');
          } catch (e) {
            // ignore localStorage errors
          }

          // Preserve any existing backend access token instead of replacing it.
          let existingAccess: string | null = null;
          try {
            existingAccess = localStorage.getItem('access_token');
          } catch (e) {
            existingAccess = null;
          }

          if (existingAccess) {
            setToken(existingAccess);
          } else {
            // Do not automatically set the Firebase token as the API access token.
            // The expected flow is that `signInWithGoogle` exchanges the Firebase
            // token for a backend token and calls `login()`.
            setToken(null);
          }

          setUser({ email: fbUser.email ?? '' });
        } else {
          try {
            localStorage.removeItem('firebase_id_token');
            localStorage.removeItem('user_email');
          } catch (e) {}
          // Sign-out should clear the backend access token too.
          try {
            localStorage.removeItem('access_token');
          } catch (e) {}
          setToken(null);
          setUser(null);
        }
      });

      return () => unsubscribe();
    } catch (e) {
      // If Firebase not initialized or environment missing, do nothing.
    }
  }, []);

  const login = (newToken: string, email: string) => {
    try {
      localStorage.setItem('access_token', newToken);
      localStorage.setItem('user_email', email);
    } catch (e) {
      // ignore
    }
    setToken(newToken);
    setUser({ email });
  };

  const logout = async () => {
    try {
      // sign out of firebase if available
      const auth = getAuth();
      await firebaseSignOut(auth);
    } catch (e) {
      // ignore if firebase not configured
    }

    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_email');
    } catch (e) {}
    setToken(null);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    initFirebaseAppIfNeeded();
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    const credential = await signInWithPopup(auth, provider);
    const fbUser = credential.user;
    const idToken = await fbUser.getIdToken();
    // Exchange Firebase ID token for our internal token via backend
    try {
      const resp = await fetch(`${BASE_URL}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: idToken }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to exchange token with backend');
      }

      const data = await resp.json();
      // TokenSchema from openapi: { accessToken, tokenType, user }
      const accessToken = data.accessToken ?? data.access_token ?? data.accessToken;
      const userEmail = data.user?.email ?? fbUser.email ?? '';

      if (accessToken) {
        try {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('user_email', userEmail);
        } catch (e) {}
        setToken(accessToken);
      } else {
        // Fallback to Firebase token if backend did not return our token
        try {
          localStorage.setItem('access_token', idToken);
          localStorage.setItem('user_email', fbUser.email ?? '');
        } catch (e) {}
        setToken(idToken);
      }

      setUser({ email: userEmail });
    } catch (e) {
      // In case of any failure, still persist the firebase token so some APIs might work,
      // and rethrow so UI can show an error.
      try {
        localStorage.setItem('access_token', idToken);
        localStorage.setItem('user_email', fbUser.email ?? '');
      } catch (er) {}
      setToken(idToken);
      setUser({ email: fbUser.email ?? '' });
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        user,
        login,
        logout,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
