import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginPage() {
  const { login } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.cantLogin"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t("login.email")}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="voce@exemplo.com"
          />
        </Field>
        <Field label={t("login.password")}>
          <PasswordInput required value={password} onChange={setPassword} placeholder="••••••••" />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? t("login.entering") : t("login.enter")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        {t("login.noAccount")}{" "}
        <Link to="/registrar" className="font-medium text-primary hover:underline">
          {t("login.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}

// ── Componentes compartilhados das telas de auth ──

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon name="diamond" filled className="text-[26px]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Saldo</h1>
        </div>
        <div className="card">
          <h2 className="mb-1 font-display text-2xl font-semibold text-on-surface">{title}</h2>
          <p className="mb-6 text-sm text-on-surface-variant">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
