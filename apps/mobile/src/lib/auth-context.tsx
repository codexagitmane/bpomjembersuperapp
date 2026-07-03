import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@bpom/shared";
import { api } from "./api";
import { getStoredToken, setStoredToken } from "./storage";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
    const token = await getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      await setStoredToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ user: User; token: string }>("/auth/login", {
      email,
      password,
      device_name: "mobile",
    });
    await setStoredToken(data.token);
    setUser(data.user);
  }, []);

  const registerEksternal = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone: string;
      password: string;
      password_confirmation: string;
    }) => {
      const { data } = await api.post<{ user: User; token: string }>("/auth/register", payload);
      await setStoredToken(data.token);
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
    await setStoredToken(null);
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
