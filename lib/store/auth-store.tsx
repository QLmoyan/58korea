"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  normalizeUsername,
  toInternalEmail,
} from "@/lib/auth/username";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProfileByUserId } from "@/lib/supabase/profile";
import { registerUserAction } from "@/lib/actions/register-user";
import type { Profile } from "@/lib/types/user";

interface AuthStoreValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (input: {
    username: string;
    password: string;
    nickname: string;
    bio?: string;
  }) => Promise<void>;
  signIn: (input: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

function mapAuthError(message: string) {
  if (message.includes("profiles_nickname_unique")) {
    return "该昵称已被占用，请换一个";
  }

  if (message.includes("nickname is required")) {
    return "请填写昵称";
  }

  if (message.includes("Invalid login credentials")) {
    return "账号或密码错误";
  }

  if (message.includes("User already registered")) {
    return "该账号已被占用，请直接登录";
  }

  if (message === "账号已存在") {
    return "账号已存在";
  }

  if (message.includes("email rate limit exceeded")) {
    return "注册请求过于频繁，请稍后再试";
  }

  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchProfileByUserId(userId);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    await loadProfile(user.id);
  }, [loadProfile, user]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          void loadProfile(sessionUser.id).catch((error) => {
            console.error("Failed to load profile:", error);
            if (!cancelled) {
              setProfile(null);
            }
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        void loadProfile(sessionUser.id).catch((error) => {
          console.error("Failed to load profile:", error);
          setProfile(null);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async ({
      username,
      password,
      nickname,
      bio = "",
    }: {
      username: string;
      password: string;
      nickname: string;
      bio?: string;
    }) => {
      const supabase = getSupabaseClient();
      const normalizedUsername = normalizeUsername(username);
      const trimmedNickname = nickname.trim();
      const trimmedBio = bio.trim();

      await registerUserAction({
        username: normalizedUsername,
        password,
        nickname: trimmedNickname,
        bio: trimmedBio,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: toInternalEmail(normalizedUsername),
        password,
      });

      if (error) {
        throw new Error(mapAuthError(error.message));
      }

      if (!data.user) {
        throw new Error("注册失败，请稍后重试");
      }

      setUser(data.user);
      await loadProfile(data.user.id);
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toInternalEmail(username),
        password,
      });

      if (error) {
        throw new Error(mapAuthError(error.message));
      }

      if (!data.user) {
        throw new Error("登录失败，请稍后重试");
      }

      setUser(data.user);
      await loadProfile(data.user.id);
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signUp, signIn, signOut, refreshProfile],
  );

  return (
    <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>
  );
}

export function useAuthStore() {
  const context = useContext(AuthStoreContext);
  if (!context) {
    throw new Error("useAuthStore must be used within AuthProvider");
  }
  return context;
}
