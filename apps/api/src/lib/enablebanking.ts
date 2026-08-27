// Cliente da Enable Banking API (Open Finance Portugal/Europa).
// Docs: https://enablebanking.com/docs/api
//
// Fluxo:
//  1. JWT RS256 assinado com a chave privada RSA da aplicação (kid = Application ID).
//  2. GET /aspsps?country=PT → lista de bancos.
//  3. POST /auth → devolve uma URL; o utilizador é redirecionado ao banco pra consentir.
//  4. O banco redireciona de volta com ?code=...; POST /sessions troca o code por sessão + contas.
//  5. GET /accounts/{uid}/transactions puxa o extrato.
import crypto from "node:crypto";
import { env } from "../config/env.js";

const EB_BASE = "https://api.enablebanking.com";

export function enableBankingConfigured(): boolean {
  return !!(env.ENABLE_BANKING_APP_ID && env.ENABLE_BANKING_PRIVATE_KEY);
}

function privateKeyPem(): string {
  // Render pode guardar a chave com quebras reais ou escapadas ("\n").
  return (env.ENABLE_BANKING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Gera um JWT RS256 válido por ~1h, assinado com a chave privada da aplicação.
function makeJwt(): string {
  const header = { typ: "JWT", alg: "RS256", kid: env.ENABLE_BANKING_APP_ID };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem());
  return `${signingInput}.${base64url(signature)}`;
}

async function ebFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${EB_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${makeJwt()}`,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Enable Banking ${path} falhou (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Tipos parciais (só o que usamos) ──
export interface EbAspsp {
  name: string;
  country: string;
  logo?: string;
  psu_types?: string[];
  maximum_consent_validity?: number; // segundos
}

export interface EbAccount {
  uid: string;
  account_id?: { iban?: string; other?: { identification?: string } };
  name?: string;
  currency?: string;
  cash_account_type?: string;
}

export interface EbTransaction {
  transaction_id?: string;
  entry_reference?: string;
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  credit_debit_indicator?: string; // CRDT (entrada) | DBIT (saída)
  transaction_amount: { currency: string; amount: string };
  remittance_information?: string[];
  status?: string;
}

export async function getAspsps(country = "PT", psuType = "personal"): Promise<EbAspsp[]> {
  const data = await ebFetch<{ aspsps: EbAspsp[] }>(
    `/aspsps?country=${encodeURIComponent(country)}&psu_type=${encodeURIComponent(psuType)}`
  );
  return data.aspsps ?? [];
}

export interface StartAuthInput {
  aspspName: string;
  country: string;
  redirectUrl: string;
  state: string;
  validUntil: string; // ISO
  psuType?: string;
}

export async function startAuth(input: StartAuthInput): Promise<{ url: string; authorization_id: string }> {
  return ebFetch<{ url: string; authorization_id: string }>(`/auth`, {
    method: "POST",
    body: {
      access: { valid_until: input.validUntil },
      aspsp: { name: input.aspspName, country: input.country },
      state: input.state,
      redirect_url: input.redirectUrl,
      psu_type: input.psuType ?? "personal",
    },
  });
}

export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  aspsp?: { name: string; country: string };
}

export async function createSession(code: string): Promise<EbSession> {
  return ebFetch<EbSession>(`/sessions`, { method: "POST", body: { code } });
}

export async function getBalances(accountUid: string) {
  return ebFetch<{ balances: { balance_amount: { currency: string; amount: string }; balance_type?: string }[] }>(
    `/accounts/${encodeURIComponent(accountUid)}/balances`
  );
}

// Puxa todas as transações de uma conta no intervalo (paginação por continuation_key).
export async function getTransactions(
  accountUid: string,
  dateFrom: string,
  dateTo: string
): Promise<EbTransaction[]> {
  const all: EbTransaction[] = [];
  let cont: string | undefined;
  for (let i = 0; i < 50; i++) {
    let qs = `date_from=${dateFrom}&date_to=${dateTo}`;
    if (cont) qs += `&continuation_key=${encodeURIComponent(cont)}`;
    const data = await ebFetch<{ transactions: EbTransaction[]; continuation_key?: string | null }>(
      `/accounts/${encodeURIComponent(accountUid)}/transactions?${qs}`
    );
    all.push(...(data.transactions ?? []));
    if (!data.continuation_key) break;
    cont = data.continuation_key;
  }
  return all;
}
