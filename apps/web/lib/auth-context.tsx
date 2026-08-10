"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEMO_MODE, login as loginRequest, logoutSession, restoreSession, setAccessToken, type SessionUser } from "./api";

interface AuthContextValue {
  user: SessionUser | null;
  ready: boolean;
  login: (employeeCode: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "iocl_session_user";
const TOKEN_KEY = "iocl_access_token";
const LAST_ACTIVITY_KEY = "iocl_last_activity";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function homeForRole(role: SessionUser["role"]) {
  if (role === "EXIT_GATE_SECURITY") return "/out";
  if (role === "ADMIN") return "/admin/records";
  return "/dashboard";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const idleTimer = useRef<number | null>(null);

  const clearLocal = () => {
    setAccessToken(null);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
  };

  useEffect(() => {
    let active = true;
    async function boot() {
      try {
        if (DEMO_MODE) {
          const rawUser = sessionStorage.getItem(USER_KEY);
          const rawToken = sessionStorage.getItem(TOKEN_KEY);
          if (rawUser && rawToken && active) {
            setAccessToken(rawToken);
            setUser(JSON.parse(rawUser) as SessionUser);
          }
        } else {
          const session = await restoreSession();
          if (session && active) setUser(session.user);
        }
      } catch {
        clearLocal();
      } finally {
        if (active) setReady(true);
      }
    }
    void boot();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expire = () => {
      clearLocal();
      router.replace("/login?reason=session-expired");
    };
    window.addEventListener("iocl-session-expired", expire);
    return () => window.removeEventListener("iocl-session-expired", expire);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const schedule = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        void logoutSession();
        clearLocal();
        router.replace("/login?reason=inactive");
      }, IDLE_TIMEOUT_MS);
    };
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
    if (Date.now() - last >= IDLE_TIMEOUT_MS) {
      void logoutSession();
      clearLocal();
      router.replace("/login?reason=inactive");
      return;
    }
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    let lastRecorded = 0;
    const activity = () => {
      const now = Date.now();
      if (now - lastRecorded < 30_000) return;
      lastRecorded = now;
      schedule();
    };
    schedule();
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [user, router]);

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace(homeForRole(user.role));
  }, [ready, user, pathname, router]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    login: async (employeeCode, password) => {
      const result = await loginRequest(employeeCode, password);
      setAccessToken(result.accessToken);
      if (DEMO_MODE) sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setUser(result.user);
      router.replace(homeForRole(result.user.role));
    },
    logout: () => {
      void logoutSession();
      clearLocal();
      router.replace("/login");
    },
  }), [user, ready, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
