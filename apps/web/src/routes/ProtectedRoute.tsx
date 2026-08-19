import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  // Depois de alguns segundos carregando, mostra o aviso de "acordando o servidor"
  // (o plano grátis do Render adormece após inatividade e leva ~1 min pra acordar).
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        <p className="font-display text-lg font-semibold text-on-surface">Carregando…</p>
        {slow && (
          <p className="max-w-xs text-sm text-on-surface-variant">
            Acordando o servidor — na primeira vez do dia isso pode levar até 1 minuto. Já já entra. 🙂
          </p>
        )}
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
