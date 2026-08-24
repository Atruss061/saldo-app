import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AnnualReport,
  Budget,
  Category,
  Goal,
  GoalContribution,
  Investment,
  MonthlyReport,
  Paginated,
  RecurringExpense,
  Transaction,
  User,
} from "./types";

// Chaves de cache centralizadas.
export const keys = {
  categories: ["categories"] as const,
  transactions: (params: object) => ["transactions", params] as const,
  budgets: (year: number, month: number) => ["budgets", year, month] as const,
  investments: (year?: number) => ["investments", year ?? "all"] as const,
  goals: ["goals"] as const,
  recurring: ["recurring"] as const,
  annual: (year: number) => ["reports", "annual", year] as const,
  monthly: (year: number, month: number) => ["reports", "monthly", year, month] as const,
};

// Invalida os relatórios (dashboards) — usado após qualquer mutação de dado.
function useInvalidateReports() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    qc.invalidateQueries({ queryKey: ["investments"] });
    qc.invalidateQueries({ queryKey: ["goals"] });
  };
}

const qs = (params: object): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// ───────────── Categorias ─────────────
export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api.get<{ categories: Category[] }>("/categories").then((r) => r.categories),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; color?: string; icon?: string }) =>
      api.post<{ category: Category }>("/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Category>) =>
      api.patch<{ category: Category }>(`/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories }),
  });
}

// ───────────── Transações ─────────────
export interface TransactionFilters {
  year?: number;
  month?: number;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  paymentMethod?: string;
  isFixed?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: keys.transactions(filters),
    queryFn: () => api.get<Paginated<Transaction>>(`/transactions${qs(filters)}`),
  });
}

export interface TransactionInput {
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number;
  date: string;
  categoryId?: string | null;
  paymentMethod?: string;
  isFixed?: boolean;
  isPaid?: boolean;
  installments?: number;
  notes?: string;
}

export function useCreateTransaction() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (body: TransactionInput) => api.post<{ transaction: Transaction }>("/transactions", body),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<TransactionInput>) =>
      api.patch<{ transaction: Transaction }>(`/transactions/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate,
  });
}

// ───────────── Gastos Fixos (recorrentes) ─────────────
export interface RecurringInput {
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: number;
  dayOfMonth: number;
  businessDay?: boolean;
  categoryId?: string | null;
  paymentMethod?: string;
  active?: boolean;
  startYear: number;
  startMonth: number;
}

export function useRecurring() {
  return useQuery({
    queryKey: keys.recurring,
    queryFn: () => api.get<{ recurring: RecurringExpense[] }>("/recurring").then((r) => r.recurring),
  });
}

export function useCreateRecurring() {
  const invalidate = useInvalidateReports();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecurringInput) => api.post<{ recurring: RecurringExpense }>("/recurring", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
      invalidate();
    },
  });
}

export type RecurringEditScope = "this" | "future" | "all";

export function useUpdateRecurring() {
  const invalidate = useInvalidateReports();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Partial<RecurringInput> & {
      scope?: RecurringEditScope;
      anchorYear?: number;
      anchorMonth?: number;
    }) => api.patch<{ recurring: RecurringExpense }>(`/recurring/${id}`, body),
    // Atualização otimista: reflete a mudança na hora (ex.: toggle ativo/pausado),
    // sem esperar o servidor. Desfaz se der erro.
    onMutate: async ({ id, ...body }) => {
      await qc.cancelQueries({ queryKey: keys.recurring });
      const prev = qc.getQueryData<RecurringExpense[]>(keys.recurring);
      qc.setQueryData<RecurringExpense[]>(keys.recurring, (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...(body as Partial<RecurringExpense>) } : r))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.recurring, ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
      invalidate();
    },
  });
}

export function useDeleteRecurring() {
  const invalidate = useInvalidateReports();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
      invalidate();
    },
  });
}

// Gera o ano inteiro dos fixos (idempotente). Usado ao abrir o Dashboard.
export function useApplyRecurringYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (year: number) =>
      api.post<{ created: number }>("/recurring/apply-year", { year }),
    onSuccess: (res) => {
      if (res.created > 0) {
        qc.invalidateQueries({ queryKey: ["reports"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
      }
    },
  });
}

// Gera as ocorrências dos fixos para um mês (idempotente no backend).
export function useApplyRecurring() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (body: { year: number; month: number; force?: boolean }) =>
      api.post<{ created: number; alreadyApplied?: boolean }>("/recurring/apply", body),
    onSuccess: (res) => {
      // só recarrega dados se algo novo foi criado (evita refetch à toa)
      if (res.created > 0) invalidate();
    },
  });
}

// ───────────── Orçamentos ─────────────
export function useBudgets(year: number, month: number) {
  return useQuery({
    queryKey: keys.budgets(year, month),
    queryFn: () => api.get<{ budgets: Budget[] }>(`/budgets${qs({ year, month })}`).then((r) => r.budgets),
  });
}

export function useSetBudget() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (body: { categoryId: string; year: number; month: number; expectedAmount: number }) =>
      api.put<{ budget: Budget }>("/budgets", body),
    onSuccess: invalidate,
  });
}

// ───────────── Investimentos ─────────────
export function useInvestments(year?: number) {
  return useQuery({
    queryKey: keys.investments(year),
    queryFn: () =>
      api.get<{ investments: Investment[] }>(`/investments${qs({ year })}`).then((r) => r.investments),
  });
}

export function useCreateInvestment() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (body: { type: string; amount: number; date: string; notes?: string }) =>
      api.post<{ investment: Investment }>("/investments", body),
    onSuccess: invalidate,
  });
}

export function useDeleteInvestment() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/investments/${id}`),
    onSuccess: invalidate,
  });
}

// ───────────── Metas ─────────────
export function useGoals() {
  return useQuery({
    queryKey: keys.goals,
    queryFn: () => api.get<{ goals: Goal[] }>("/goals").then((r) => r.goals),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; targetAmount: number; targetDate?: string | null; color?: string; icon?: string }) =>
      api.post<{ goal: Goal }>("/goals", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, ...body }: { goalId: string; amount: number; date: string }) =>
      api.post<{ contribution: GoalContribution }>(`/goals/${goalId}/contributions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  });
}

// ───────────── Perfil / Moeda ─────────────
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (body: { currency?: string; name?: string }) =>
      api.patch<{ user: User }>("/auth/me", body).then((r) => r.user),
  });
}

export function useConvertCurrency() {
  return useMutation({
    mutationFn: (body: { currency: string; rate: number }) =>
      api.post<{ user: User }>("/auth/convert-currency", body).then((r) => r.user),
  });
}

// ───────────── Relatórios ─────────────
export function useAnnualReport(year: number) {
  return useQuery({
    queryKey: keys.annual(year),
    queryFn: () => api.get<AnnualReport>(`/reports/annual${qs({ year })}`),
  });
}

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: keys.monthly(year, month),
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly${qs({ year, month })}`),
  });
}
