import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError, setAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AuthResponse {
  user: User;
  accessToken: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura a sessão no carregamento (via cookie de refresh).
  // Só desloga se o servidor disser explicitamente 401 (sessão inválida).
  // Erros passageiros (rede, ou o serviço grátis do Render "acordando") são
  // tentados de novo algumas vezes, pra não cair fora da conta sem motivo.
  useEffect(() => {
    let active = true;
    (async () => {
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await api.post<AuthResponse>("/auth/refresh", undefined, { skipAuthRefresh: true });
          if (!active) return;
          setAccessToken(res.accessToken);
          setUser(res.user);
          break;
        } catch (err) {
          // 401 = não há sessão válida → mostra login e para de tentar.
          if (err instanceof ApiError && err.status === 401) {
            if (active) setUser(null);
            break;
          }
          // Erro passageiro (rede/5xx/cold start) → espera e tenta de novo.
          if (attempt < maxAttempts) {
            await sleep(attempt * 1500);
            continue;
          }
          if (active) setUser(null);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password }, { skipAuthRefresh: true });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>(
      "/auth/register",
      { name, email, password },
      { skipAuthRefresh: true }
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout", undefined, { skipAuthRefresh: true }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await api.delete("/auth/me", { password });
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, deleteAccount }),
    [user, loading, login, register, logout, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
