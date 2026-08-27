import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { AuthShell, Field } from "./LoginPage";
import { PasswordInput } from "@/components/PasswordInput";

export function RegisterPage() {
  const { register } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("register.pwTooShort"));
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      // Conta nova → passo a passo de configuração inicial.
      navigate("/bem-vindo", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("register.cantCreate"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("register.title")} subtitle={t("register.subtitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t("register.name")}>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder={t("register.namePh")}
          />
        </Field>
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
          <PasswordInput required value={password} onChange={setPassword} placeholder={t("register.min8")} />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? t("register.creating") : t("register.title")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        {t("register.haveAccount")}{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("login.enter")}
        </Link>
      </p>
    </AuthShell>
  );
}
