"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clearUserSessionLocalData } from "@/lib/auth/session-cleanup";
import type { User } from "@supabase/supabase-js";
import {
  normalizeUsername,
  toInternalEmail,
} from "@/lib/auth/username";
import { AUTH_INIT_TIMEOUT_MS } from "@/lib/constants/network";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";
import { fetchProfileByUserId } from "@/lib/supabase/profile";
import { registerUserAction } from "@/lib/actions/register-user";
import type { Profile } from "@/lib/types/user";

interface AuthStoreValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initError: string | null;
  signUp: (input: {
    username: string;
    password: string;
    nickname: string;
    bio?: string;
  }) => Promise<void>;
  signIn: (input: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryInit: () => void;
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
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const previousUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await withTimeout(
      fetchProfileByUserId(userId),
      AUTH_INIT_TIMEOUT_MS,
      "资料加载超时",
    );
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
      setInitError(null);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        logClientError("auth.init.safety", new Error("Auth init safety timeout"));
        setLoading(false);
        setInitError((current) => current ?? "登录状态加载超时，请检查网络后重试");
      }
    }, AUTH_INIT_TIMEOUT_MS + 2_000);

    async function initAuth() {
      setLoading(true);
      setInitError(null);

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "登录状态加载超时",
        );
        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        const sessionUser = data.session?.user ?? null;
        previousUserIdRef.current = sessionUser?.id ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          void loadProfile(sessionUser.id).catch((error) => {
            logClientError("auth.profile", error, { userId: sessionUser.id });
            if (!cancelled) {
              setProfile(null);
            }
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        logClientError("auth.init", error);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setInitError(
            error instanceof Error
              ? error.message
              : "登录状态加载失败，请检查网络后重试",
          );
        }
      } finally {
        window.clearTimeout(safetyTimer);
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
      const nextUserId = sessionUser?.id ?? null;

      if (previousUserIdRef.current !== nextUserId) {
        if (nextUserId === null || previousUserIdRef.current !== null) {
          clearUserSessionLocalData();
        }
        previousUserIdRef.current = nextUserId;
      }

      setUser(sessionUser);

      if (sessionUser) {
        void loadProfile(sessionUser.id).catch((error) => {
          logClientError("auth.profile", error, { userId: sessionUser.id });
          setProfile(null);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [loadProfile, initAttempt]);

  const retryInit = useCallback(() => {
    setInitAttempt((current) => current + 1);
  }, []);

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

    clearUserSessionLocalData();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      initError,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      retryInit,
    }),
    [user, profile, loading, initError, signUp, signIn, signOut, refreshProfile, retryInit],
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
