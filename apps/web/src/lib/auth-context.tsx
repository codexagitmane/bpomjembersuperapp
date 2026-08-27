"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@bpom/shared";
import { api, getStoredToken, setStoredToken } from "./api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    opts?: { remember?: boolean; twoFactorCode?: string }
  ) => Promise<{ twoFactorRequired?: boolean }>;
  registerEksternal: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, opts?: { remember?: boolean; twoFactorCode?: string }) => {
      const { data } = await api.post<{ user?: User; token?: string; two_factor_required?: boolean }>("/auth/login", {
        email,
        password,
        device_name: "web",
        remember: opts?.remember ?? false,
        two_factor_code: opts?.twoFactorCode,
      });
      if (data.two_factor_required) return { twoFactorRequired: true };
      if (data.token && data.user) {
        setStoredToken(data.token);
        setUser(data.user);
        // Re-arm pengingat 2FA agar tampil setiap kali user login (bukan sekali per sesi).
        if (typeof window !== "undefined") sessionStorage.removeItem("lentera_2fa_nudged");
      }
      return {};
    },
    []
  );

  const registerEksternal = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone: string;
      password: string;
      password_confirmation: string;
    }) => {
      const { data } = await api.post<{ user: User; token: string }>("/auth/register", payload);
      setStoredToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // token mungkin sudah invalid — tetap lanjut bersihkan sesi lokal
    }
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, registerEksternal, logout, refresh }),
    [user, isLoading, login, registerEksternal, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
