// Cliente mínimo da API do Pluggy (Open Finance Brasil).
// Docs: https://docs.pluggy.ai
//
// Fluxo:
//  1. /auth  → troca clientId/clientSecret por uma apiKey (válida ~2h).
//  2. /connect_token → gera um token de curta duração para o widget no frontend.
//  3. /accounts?itemId= e /transactions?accountId= → puxam os dados após o consentimento.
import { env } from "../config/env.js";

const PLUGGY_BASE = "https://api.pluggy.ai";

export function pluggyConfigured(): boolean {
  return !!(env.PLUGGY_CLIENT_ID && env.PLUGGY_CLIENT_SECRET);
}

// ── Cache da apiKey em memória (evita chamar /auth a cada request) ──
let cachedApiKey: string | null = null;
let cachedApiKeyExp = 0; // epoch ms

async function pluggyAuth(): Promise<string> {
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: env.PLUGGY_CLIENT_ID,
      clientSecret: env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pluggy /auth falhou (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { apiKey: string };
  return data.apiKey;
}

export async function getApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && now < cachedApiKeyExp) return cachedApiKey;
  const key = await pluggyAuth();
  cachedApiKey = key;
  cachedApiKeyExp = now + 100 * 60 * 1000; // renova a cada 100 min (validade real ~120 min)
  return key;
}

// Wrapper genérico para chamadas autenticadas com X-API-KEY.
async function pluggyFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${PLUGGY_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pluggy ${path} falhou (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Connect token (widget) ──
export interface ConnectTokenOptions {
  clientUserId?: string;
  webhookUrl?: string;
  itemId?: string; // presente = modo "atualizar item existente"
}

export async function createConnectToken(opts: ConnectTokenOptions = {}): Promise<string> {
  const body: Record<string, unknown> = {};
  if (opts.itemId) body.itemId = opts.itemId;
  const options: Record<string, unknown> = {};
  if (opts.clientUserId) options.clientUserId = opts.clientUserId;
  if (opts.webhookUrl) options.webhookUrl = opts.webhookUrl;
  if (Object.keys(options).length) body.options = options;
  const data = await pluggyFetch<{ accessToken: string }>("/connect_token", {
    method: "POST",
    body,
  });
  return data.accessToken;
}

// ── Tipos parciais dos recursos do Pluggy (só o que usamos) ──
export interface PluggyItem {
  id: string;
  status: string;
  connector?: { id: number; name: string; imageUrl?: string };
  error?: { message?: string } | null;
}

export interface PluggyAccount {
  id: string;
  type: string; // BANK | CREDIT
  subtype?: string;
  name?: string;
  number?: string;
  balance?: number;
  currencyCode?: string;
}

export interface PluggyTransaction {
  id: string;
  description?: string;
  descriptionRaw?: string;
  amount: number; // pode vir negativo (saída) ou positivo (entrada)
  date: string; // ISO
  type?: string; // DEBIT (saída) | CREDIT (entrada)
  category?: string | null;
  paymentData?: unknown;
}

export function getItem(itemId: string) {
  return pluggyFetch<PluggyItem>(`/items/${itemId}`);
}

export function deleteItem(itemId: string) {
  return pluggyFetch<void>(`/items/${itemId}`, { method: "DELETE" });
}

export async function getAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await pluggyFetch<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`
  );
  return data.results ?? [];
}

// Puxa TODAS as transações de uma conta no intervalo, via /v2/transactions
// (paginação por cursor — a v1 /transactions foi descontinuada, retorna 410).
export async function getTransactions(
  accountId: string,
  from: string,
  to: string
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  let after: string | undefined;
  // trava de segurança: no máx. 50 páginas (25k transações)
  for (let i = 0; i < 50; i++) {
    // v2 usa dateFrom/dateTo e cursor `after` (não aceita from/to/pageSize).
    let qs = `accountId=${encodeURIComponent(accountId)}&dateFrom=${from}&dateTo=${to}`;
    if (after) qs += `&after=${encodeURIComponent(after)}`;
    const data = await pluggyFetch<{ results: PluggyTransaction[]; next?: string | null }>(
      `/v2/transactions?${qs}`
    );
    all.push(...(data.results ?? []));
    // `next` é a URL da próxima página; extraímos o cursor `after` dela.
    const raw = data.next;
    if (!raw) break;
    let nextAfter: string | null = null;
    try {
      const u = new URL(raw, PLUGGY_BASE);
      nextAfter = u.searchParams.get("after") ?? u.searchParams.get("cursor");
    } catch {
      // `next` não é URL — pode ser o próprio cursor
      if (!raw.includes("://") && !raw.includes("=")) nextAfter = raw;
    }
    if (!nextAfter) break;
    after = nextAfter;
  }
  return all;
}
