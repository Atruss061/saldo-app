import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  // Marca quando o usuário fez uma ação manual (login/registro/logout).
  // A restauração automática (abaixo) NUNCA sobrescreve uma ação manual —
  // isso evita a "corrida" que derrubava o login.
  const manualAuth = useRef(false);

  // Restaura a sessão no carregamento (via cookie de refresh).
  // Só desloga se o servidor disser explicitamente 401 (sessão inválida).
  // Erros passageiros (rede, ou o serviço grátis do Render "acordando") são
  // tentados de novo várias vezes, pra não cair fora da conta sem motivo.
  useEffect(() => {
    let active = true;
    const stillInitial = () => active && !manualAuth.current;
    (async () => {
      const maxAttempts = 8;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (!stillInitial()) return; // usuário já logou/deslogou manualmente
        try {
          const res = await api.post<AuthResponse>("/auth/refresh", undefined, { skipAuthRefresh: true });
          if (!stillInitial()) return;
          setAccessToken(res.accessToken);
          setUser(res.user);
          break;
        } catch (err) {
          // 401 = não há sessão válida → mostra login e para de tentar.
          if (err instanceof ApiError && err.status === 401) {
            if (stillInitial()) setUser(null);
            break;
          }
          // Erro passageiro (rede/5xx/cold start) → espera e tenta de novo (até ~1 min).
          if (attempt < maxAttempts) {
            await sleep(Math.min(attempt * 2000, 8000));
            continue;
          }
          if (stillInitial()) setUser(null);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    manualAuth.current = true;
    const res = await api.post<AuthResponse>("/auth/login", { email, password }, { skipAuthRefresh: true });
    setAccessToken(res.accessToken);
    setUser(res.user);
    setLoading(false);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    manualAuth.current = true;
    const res = await api.post<AuthResponse>(
      "/auth/register",
      { name, email, password },
      { skipAuthRefresh: true }
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    manualAuth.current = true;
    await api.post("/auth/logout", undefined, { skipAuthRefresh: true }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    manualAuth.current = true;
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
