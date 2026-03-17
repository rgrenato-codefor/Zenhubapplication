/**
 * FinancialContext.tsx
 *
 * Real-time Firestore-backed context for cash-flow transactions.
 * Collection: `financialTransactions` — one doc per transaction, scoped by companyId.
 *
 * Consumers:
 *  - CompanyFinancial  → full CRUD UI
 *  - CompanySchedule   → auto-injects "entrada" on session closure
 *  - CompanyCommissions → auto-injects "saída" on commission payment
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  subscribeFinancialTransactionsByCompany,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
  type FinancialTransaction,
} from "../../lib/firestore";

// ─── Re-export type so consumers can import from here ─────────────────────────
export type { FinancialTransaction };
export type TxType = "entrada" | "saida";

// ─── Context shape ────────────────────────────────────────────────────────────

interface FinancialContextValue {
  transactions: FinancialTransaction[];
  isLoading: boolean;
  /** Creates a transaction in Firestore and returns the generated id */
  addTransaction: (tx: Omit<FinancialTransaction, "id" | "companyId" | "createdAt">) => Promise<string>;
  updateTransaction: (id: string, patch: Partial<Omit<FinancialTransaction, "id" | "companyId" | "createdAt">>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FinancialContext = createContext<FinancialContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const companyId = user?.companyId ?? "";

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Real-time subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = subscribeFinancialTransactionsByCompany(companyId, (txs) => {
      setTransactions(txs);
      setIsLoading(false);
    });

    return unsub;
  }, [companyId]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const addTransaction = useCallback(
    async (tx: Omit<FinancialTransaction, "id" | "companyId" | "createdAt">): Promise<string> => {
      const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await createFinancialTransaction({ ...tx, id, companyId });
      return id;
    },
    [companyId]
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Omit<FinancialTransaction, "id" | "companyId" | "createdAt">>) => {
      await updateFinancialTransaction(id, patch);
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteFinancialTransaction(id);
  }, []);

  return (
    <FinancialContext.Provider
      value={{ transactions, isLoading, addTransaction, updateTransaction, deleteTransaction }}
    >
      {children}
    </FinancialContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinancial(): FinancialContextValue {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error("useFinancial must be used inside <FinancialProvider>");
  return ctx;
}
