/** Accès données (Lovable Cloud) + hooks React Query partagés. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, isQueueable } from "@/lib/offline";

export const qk = {
  profile: ["profile"] as const,
  customers: ["customers"] as const,
  products: ["products"] as const,
  suppliers: ["suppliers"] as const,
  sales: ["sales"] as const,
  sale: (id: string) => ["sale", id] as const,
  purchases: ["purchases"] as const,
  payments: ["payments"] as const,
  expenses: ["expenses"] as const,
  cash: ["cash"] as const,
  stock: ["stock_movements"] as const,
  activity: ["activity"] as const,
  returns: ["returns"] as const,
};

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export type Row<T> = T;

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return data;
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: auth.user.id, full_name: auth.user.email?.split("@")[0] ?? null })
        .select("*")
        .single();
      if (insertError) throw new Error(insertError.message);
      return created;
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: qk.customers,
    queryFn: () =>
      unwrap(supabase.from("customers").select("*").order("created_at", { ascending: false })),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: qk.products,
    queryFn: () =>
      unwrap(supabase.from("products").select("*").order("created_at", { ascending: false })),
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: qk.suppliers,
    queryFn: () =>
      unwrap(supabase.from("suppliers").select("*").order("created_at", { ascending: false })),
  });
}

export function useSales() {
  return useQuery({
    queryKey: qk.sales,
    queryFn: () =>
      unwrap(
        supabase
          .from("sales")
          .select("*, customers(name)")
          .order("sale_date", { ascending: false })
          .limit(500),
      ),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: qk.sale(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name, phone), sale_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function usePurchases() {
  return useQuery({
    queryKey: qk.purchases,
    queryFn: () =>
      unwrap(
        supabase
          .from("purchases")
          .select("*, suppliers(name), purchase_items(*)")
          .order("purchase_date", { ascending: false })
          .limit(500),
      ),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: qk.payments,
    queryFn: () =>
      unwrap(
        supabase
          .from("payments")
          .select("*, customers(name), suppliers(name), sales(number)")
          .order("paid_at", { ascending: false })
          .limit(500),
      ),
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: qk.expenses,
    queryFn: () =>
      unwrap(
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(500),
      ),
  });
}

export function useCashTransactions() {
  return useQuery({
    queryKey: qk.cash,
    queryFn: () =>
      unwrap(
        supabase
          .from("cash_transactions")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(1000),
      ),
  });
}

export function useStockMovements() {
  return useQuery({
    queryKey: qk.stock,
    queryFn: () =>
      unwrap(
        supabase
          .from("stock_movements")
          .select("*, products(name, unit)")
          .order("occurred_at", { ascending: false })
          .limit(300),
      ),
  });
}

export function useActivity() {
  return useQuery({
    queryKey: qk.activity,
    queryFn: () =>
      unwrap(
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200),
      ),
  });
}

/** Invalide tout ce qui dépend d'une opération financière. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    [
      qk.sales,
      qk.products,
      qk.customers,
      qk.suppliers,
      qk.payments,
      qk.purchases,
      qk.expenses,
      qk.cash,
      qk.stock,
      qk.activity,
      qk.returns,
    ].forEach((key) => qc.invalidateQueries({ queryKey: key }));
  };
}

export function useCashClosures() {
  return useQuery({
    queryKey: ["cash_closures"],
    queryFn: () =>
      unwrap(
        supabase.from("cash_closures").select("*").order("closure_date", { ascending: false }).limit(90),
      ),
  });
}

/** Lignes de vente (pour le bénéfice total par produit). */
export function useSaleItems() {
  return useQuery({
    queryKey: ["sale_items"],
    queryFn: () =>
      unwrap(
        supabase
          .from("sale_items")
          .select("*, sales(status, sale_date)")
          .limit(5000),
      ),
  });
}

/** Ventes complètes (reçus) : client + lignes, pour l'espace Reçus et la recherche. */
export function useSaleReceipts() {
  return useQuery({
    queryKey: ["receipts"],
    queryFn: () =>
      unwrap(
        supabase
          .from("sales")
          .select("*, customers(name, phone, whatsapp), sale_items(*)")
          .order("sale_date", { ascending: false })
          .limit(500),
      ),
  });
}

export type RpcName =
  | "create_sale"
  | "create_purchase"
  | "record_payment"
  | "create_expense"
  | "create_sale_return"
  | "close_cash"
  | "reset_history";

/** Appel d'une fonction métier côté base (transaction atomique). */
export function useRpc<TArgs extends Record<string, unknown>, TResult = unknown>(
  fn: RpcName,
  options?: { offlineLabel?: string },
) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline && isQueueable(fn)) {
        enqueue(fn, args, options?.offlineLabel ?? fn);
        return { queued: true } as TResult;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(fn, args);
      if (error) throw new Error(error.message);
      return data as TResult;
    },
    onSuccess: () => invalidate(),
  });
}
