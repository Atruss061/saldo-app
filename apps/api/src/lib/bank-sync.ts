// Sincronização de dados bancários (Pluggy → tabela transactions do Saldo).
// Idempotente: cada transação do Pluggy tem um id único guardado em Transaction.externalId,
// então rodar de novo apenas atualiza/insere, nunca duplica.
import { prisma } from "./prisma.js";
import { getAccounts, getTransactions, getItem, type PluggyTransaction } from "./pluggy.js";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// EXPENSE (saída) vs INCOME (entrada): usa o campo `type` normalizado do Pluggy;
// se ausente, cai no sinal do valor (negativo = saída).
function txDirection(t: PluggyTransaction): "INCOME" | "EXPENSE" {
  if (t.type === "CREDIT") return "INCOME";
  if (t.type === "DEBIT") return "EXPENSE";
  return t.amount < 0 ? "EXPENSE" : "INCOME";
}

export interface SyncResult {
  accounts: number;
  imported: number; // transações novas ou atualizadas
}

// Sincroniza um item (conexão) inteiro: atualiza status, contas e transações.
export async function syncItem(itemId: string): Promise<SyncResult> {
  const conn = await prisma.bankConnection.findUnique({ where: { itemId } });
  if (!conn) return { accounts: 0, imported: 0 };

  // 1) Atualiza metadados do item (status/erro/conector)
  try {
    const item = await getItem(itemId);
    await prisma.bankConnection.update({
      where: { id: conn.id },
      data: {
        status: item.status,
        lastError: item.error?.message ?? null,
        connectorId: item.connector?.id ?? conn.connectorId,
        connectorName: item.connector?.name ?? conn.connectorName,
        connectorImage: item.connector?.imageUrl ?? conn.connectorImage,
      },
    });
  } catch {
    // segue mesmo se o /items falhar — o importante é puxar as transações
  }

  const from = ymd(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)); // ~2 anos atrás
  const to = ymd(new Date(Date.now() + 24 * 60 * 60 * 1000)); // amanhã (inclui hoje)

  const accounts = await getAccounts(itemId);
  let imported = 0;

  for (const acc of accounts) {
    // upsert da conta
    await prisma.bankAccount.upsert({
      where: { accountId: acc.id },
      create: {
        connectionId: conn.id,
        accountId: acc.id,
        name: acc.name ?? null,
        type: acc.type ?? null,
        subtype: acc.subtype ?? null,
        number: acc.number ?? null,
        balance: acc.balance ?? null,
        currencyCode: acc.currencyCode ?? null,
      },
      update: {
        name: acc.name ?? null,
        type: acc.type ?? null,
        subtype: acc.subtype ?? null,
        number: acc.number ?? null,
        balance: acc.balance ?? null,
        currencyCode: acc.currencyCode ?? null,
      },
    });

    const isCredit = acc.type === "CREDIT";
    const txs = await getTransactions(acc.id, from, to);

    for (const t of txs) {
      const direction = txDirection(t);
      const desc = t.description || t.descriptionRaw || "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base: any = {
        type: direction,
        amount: Math.abs(t.amount),
        date: new Date(t.date),
        description: desc,
        paymentMethod: isCredit ? "CREDIT" : "DEBIT",
        notes: t.category ?? null,
      };
      await prisma.transaction.upsert({
        where: { externalId: t.id },
        // Na criação: marca a origem e vincula ao usuário. isPaid=true (já aconteceu).
        create: {
          ...base,
          userId: conn.userId,
          externalId: t.id,
          source: "OPEN_FINANCE",
          isFixed: false,
          isPaid: true,
        },
        // Na atualização: NÃO mexe em categoria/isPaid (preserva ajustes do usuário).
        update: base,
      });
      imported++;
    }
  }

  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: { lastSyncedAt: new Date() },
  });

  return { accounts: accounts.length, imported };
}
