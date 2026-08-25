// Tipos compartilhados com a API (espelham os models do Prisma serializados).

export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentMethod = "DEBIT" | "CREDIT" | "TRANSFER" | "AUTO_DEBIT" | "PIX" | "CASH";
export type InvestmentType = "RESERVE" | "FIXED_INCOME" | "VARIABLE_INCOME";

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface CategoryRef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  categoryId: string | null;
  category: CategoryRef | null;
  paymentMethod: PaymentMethod;
  isFixed: boolean;
  isPaid: boolean;
  installments: number;
  installmentNo?: number | null;
  installmentGroup?: string | null;
  notes?: string | null;
  recurringId?: string | null;
  manuallyEdited?: boolean;
}

export interface RecurringExpense {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  dayOfMonth: number;
  businessDay: boolean;
  categoryId: string | null;
  category: CategoryRef | null;
  paymentMethod: PaymentMethod;
  active: boolean;
  startYear: number;
  startMonth: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  category: CategoryRef;
  year: number;
  month: number;
  expectedAmount: number;
}

export interface Investment {
  id: string;
  type: InvestmentType;
  amount: number;
  date: string;
  notes?: string | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  color: string;
  icon: string;
  savedAmount: number;
  progress: number;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
}

// Relatórios
export interface AnnualMonth {
  month: number;
  name: string;
  income: number;
  expense: number;
  balance: number;
}

export interface AnnualReport {
  year: number;
  months: AnnualMonth[];
  totals: { income: number; expense: number; balance: number; invested: number };
}

export interface MonthlyCategory {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  spent: number;
  expected: number;
  budgetUsage: number | null;
  percentageOfExpense: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  monthName: string;
  totals: { income: number; expense: number; balance: number; invested: number };
  byCategory: MonthlyCategory[];
  byPaymentMethod: { paymentMethod: PaymentMethod; total: number }[];
}

export interface Paginated<T> {
  transactions: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
