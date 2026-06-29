// ============================================================================
// Auth Context Provider
// Wraps Supabase Auth state with React Context for role-based access
// ============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  PropsWithChildren,
} from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Profile, UserRole } from "./types";

// ---- Types ----

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { first_name?: string; last_name?: string; role?: UserRole }
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

// ---- Context ----

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---- Provider ----

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: null,
    loading: true,
    initialized: false,
  });

  // Fetch user profile from the profiles table
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error.message);
      return null;
    }

    return data as Profile;
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const profile = await fetchProfile(session.user.id);
          setState({
            session,
            user: session.user,
            profile,
            role: profile?.role ?? null,
            loading: false,
            initialized: true,
          });
        } else if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          session,
          user: session.user,
          profile,
          role: profile?.role ?? null,
          loading: false,
          initialized: true,
        });
      } else if (event === "SIGNED_OUT") {
        setState({
          session: null,
          user: null,
          profile: null,
          role: null,
          loading: false,
          initialized: true,
        });
      } else if (event === "TOKEN_REFRESHED" && session) {
        setState((prev) => ({
          ...prev,
          session,
          user: session.user,
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ---- Auth Methods ----

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { first_name?: string; last_name?: string; role?: UserRole }
    ) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata ?? {},
        },
      });
      return { error };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      profile,
      role: profile?.role ?? null,
    }));
  }, [state.user, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!state.user) return { error: new Error("Not authenticated") };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", state.user.id);

      if (!error) {
        await refreshProfile();
      }

      return { error: error ? new Error(error.message) : null };
    },
    [state.user, refreshProfile]
  );

  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ---- Hook ----

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
