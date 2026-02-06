import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { API_URL } from "~/config/environment";
import { auth } from "./firebase";

/**
 * These are all the primary information that are stored in the mongod-db and are easy accesible
 */
export interface BackendUser {
  _id: string;
  userName: string;
  email: string;
  createdAt: string; // ISO date string
  updatedAt: string;
}

interface CombinedUser {
  // Firebase uid <-> this should be the same as stored in the mongo db backend id
  uid: string;
  // We get this from the oauth2 provider google in this example
  photoURL: string | null;
  emailVerified: boolean;
  // Backend profile data
  profile: BackendUser | null;
  role: string | null;
  // we do not store this in the backenduser as this should only be completed users
  isFirstTimeUser: boolean;
}

interface AuthContextType {
  user: CombinedUser | null;
  loading: boolean;
  authError: string | null;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  refreshUserData: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CombinedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  function clearError() {
    setAuthError(null);
  }

  // Helper function to create combined user object
  function createCombinedUser(
    firebaseUser: User,
    profileData: BackendUser | null,
    setupRequired: boolean,
    userRole: string | null,
  ): CombinedUser {
    return {
      uid: firebaseUser.uid,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      profile: profileData,
      role: userRole,
      isFirstTimeUser: setupRequired,
    };
  }

  // Get ID token for the current user
  async function getIdToken(forceRefresh: boolean = false): Promise<string> {
    if (!auth.currentUser) {
      throw new Error("No authenticated user found");
    }

    try {
      const idToken = await auth.currentUser.getIdToken(forceRefresh);
      return idToken;
    } catch (error) {
      console.error("Error getting ID token:", error);
      throw new Error("Failed to get authentication token");
    }
  }

  async function logout() {
    try {
      setAuthError(null);
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      setAuthError(error.message);
      throw error;
    }
  }

  // Refresh user data from backend
  async function refreshUserData() {
    if (!auth.currentUser) return;

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      const combinedUser = createCombinedUser(
        auth.currentUser,
        data.profile,
        !data.exists,
        null,
      );
      setUser(combinedUser);
    } catch (error: any) {
      console.error("Error refreshing user data:", error);
      setAuthError(error.message);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch user profile");
          }

          const data = await response.json();

          const combinedUser = createCombinedUser(
            firebaseUser,
            data.profile,
            !data.exists,
            null,
          );
          setUser(combinedUser);
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
          setAuthError(error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setAuthError(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    loading,
    authError,
    logout,
    signInWithGoogle,
    refreshUserData,
    getIdToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

interface GuardedAuthContextType {
  user: BackendUser;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  refreshUserData: () => Promise<void>;
}

const GuardedAuthContext = createContext<GuardedAuthContextType | null>(null);

export function useGuardedAuth(): GuardedAuthContextType {
  const context = useContext(GuardedAuthContext);
  if (!context) {
    throw new Error("useGuardedAuth must be used within a StudentGuard");
  }
  return context;
}

export { GuardedAuthContext };
