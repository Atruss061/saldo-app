// Sincronização Enable Banking → tabela transactions do Saldo.
// Idempotente: cada transação tem um externalId estável guardado em Transaction.externalId.
import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { getBalances, getTransactions, type EbAccount, type EbTransaction } from "./enablebanking.js";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function txDirection(t: EbTransaction): "INCOME" | "EXPENSE" {
  return t.credit_debit_indicator === "CRDT" ? "INCOME" : "EXPENSE";
}

// id estável por transação. Nem todo banco manda transaction_id; então caímos
// para entry_reference ou um hash do conteúdo (evita duplicar na re-sincronização).
function externalIdFor(accountUid: string, t: EbTransaction): string {
  const raw = t.transaction_id || t.entry_reference;
  if (raw) return `eb_${raw}`;
  const basis = [
    accountUid,
    t.booking_date || t.value_date || "",
    t.transaction_amount?.amount || "",
    t.credit_debit_indicator || "",
    (t.remittance_information || []).join("|"),
  ].join("::");
  return `eb_${crypto.createHash("sha256").update(basis).digest("hex").slice(0, 40)}`;
}

async function upsertAccount(connectionId: string, acc: EbAccount, balance?: number | null, currency?: string | null) {
  const number = acc.account_id?.iban || acc.account_id?.other?.identification || null;
  await prisma.bankAccount.upsert({
    where: { accountId: acc.uid },
    create: {
      connectionId,
      accountId: acc.uid,
      name: acc.name ?? null,
      type: acc.cash_account_type ?? null,
      number,
      balance: balance ?? null,
      currencyCode: currency ?? acc.currency ?? null,
    },
    update: {
      name: acc.name ?? null,
      type: acc.cash_account_type ?? null,
      number,
      balance: balance ?? null,
      currencyCode: currency ?? acc.currency ?? null,
    },
  });
}

async function importAccountTransactions(userId: string, accountUid: string): Promise<number> {
  const from = ymd(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)); // ~2 anos
  const to = ymd(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const txs = await getTransactions(accountUid, from, to);
  let n = 0;
  for (const t of txs) {
    const dateStr = t.booking_date || t.value_date || t.transaction_date;
    if (!dateStr) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base: any = {
      type: txDirection(t),
      amount: Math.abs(Number(t.transaction_amount?.amount ?? "0")),
      date: new Date(dateStr),
      description: (t.remittance_information || []).join(" ").slice(0, 160),
      paymentMethod: "DEBIT",
    };
    await prisma.transaction.upsert({
      where: { externalId: externalIdFor(accountUid, t) },
      create: { ...base, userId, externalId: externalIdFor(accountUid, t), source: "OPEN_FINANCE", isFixed: false, isPaid: true },
      update: base,
    });
    n++;
  }
  return n;
}

// Sincroniza logo após criar a sessão (temos a lista de contas na mão).
export async function syncNewSession(
  userId: string,
  connectionId: string,
  accounts: EbAccount[]
): Promise<{ accounts: number; imported: number }> {
  let imported = 0;
  for (const acc of accounts) {
    let balance: number | null = null;
    let currency: string | null = null;
    try {
      const b = await getBalances(acc.uid);
      const first = b.balances?.[0];
      if (first) {
        balance = Number(first.balance_amount.amount);
        currency = first.balance_amount.currency;
      }
    } catch {
      /* saldo é opcional */
    }
    await upsertAccount(connectionId, acc, balance, currency);
    imported += await importAccountTransactions(userId, acc.uid);
  }
  await prisma.bankConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date(), status: "UPDATED" } });
  return { accounts: accounts.length, imported };
}

// Re-sincroniza uma conexão já existente (usa as contas guardadas).
export async function syncConnection(connectionId: string): Promise<{ accounts: number; imported: number }> {
  const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId }, include: { accounts: true } });
  if (!conn) return { accounts: 0, imported: 0 };
  let imported = 0;
  for (const acc of conn.accounts) {
    try {
      const b = await getBalances(acc.accountId);
      const first = b.balances?.[0];
      if (first) {
        await prisma.bankAccount.update({
          where: { id: acc.id },
          data: { balance: Number(first.balance_amount.amount), currencyCode: first.balance_amount.currency },
        });
      }
    } catch {
      /* ignora saldo */
    }
    imported += await importAccountTransactions(conn.userId, acc.accountId);
  }
  await prisma.bankConnection.update({ where: { id: conn.id }, data: { lastSyncedAt: new Date() } });
  return { accounts: conn.accounts.length, imported };
}
