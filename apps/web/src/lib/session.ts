// Guarda o refresh token no localStorage (persistência confiável, independente de cookie).
// O access token continua só na memória (curta duração).
const KEY = "saldo_refresh";

export function getStoredRefresh(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setStoredRefresh(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage indisponível (ex.: modo restrito) — ignora */
  }
}
