import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { AuthShell, Field } from "./LoginPage";
import { PasswordInput } from "@/components/PasswordInput";

export function RegisterPage() {
  const { register } = useAuth();
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
      setError("A senha precisa de ao menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      // Conta nova → passo a passo de configuração inicial.
      navigate("/bem-vindo", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Criar conta" subtitle="Comece a organizar suas finanças em minutos.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nome">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Seu nome"
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="voce@exemplo.com"
          />
        </Field>
        <Field label="Senha">
          <PasswordInput required value={password} onChange={setPassword} placeholder="Mínimo de 8 caracteres" />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Criando…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
