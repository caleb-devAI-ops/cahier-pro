/**
 * Définitions financières centralisées.
 * Le tableau de bord, les rapports et les fiches clients utilisent uniquement
 * ces fonctions afin d'éviter des chiffres contradictoires.
 */
import { num, round2 } from "./format";

export interface SaleLike {
  total: number | string;
  cogs: number | string;
  paid: number | string;
  refunded: number | string;
  status: string;
  sale_date: string;
}

export interface ExpenseLike {
  amount: number | string;
  expense_date: string;
}

export interface CashLike {
  type: string;
  amount: number | string;
  occurred_at: string;
}

/** Chiffre d'affaires : ventes validées, retours déduits, annulations exclues. */
export function revenue(sales: SaleLike[]): number {
  return round2(
    sales
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + num(s.total) - num(s.refunded), 0),
  );
}

/** Coût des marchandises vendues. */
export function cogs(sales: SaleLike[]): number {
  return round2(
    sales.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + num(s.cogs), 0),
  );
}

/** Marge brute = chiffre d'affaires − coût des marchandises vendues. */
export function grossProfit(sales: SaleLike[]): number {
  return round2(revenue(sales) - cogs(sales));
}

export function totalExpenses(expenses: ExpenseLike[]): number {
  return round2(expenses.reduce((sum, e) => sum + num(e.amount), 0));
}

/** Bénéfice net = marge brute − dépenses professionnelles. */
export function netProfit(sales: SaleLike[], expenses: ExpenseLike[]): number {
  return round2(grossProfit(sales) - totalExpenses(expenses));
}

/** Créances clients = total des ventes − paiements reçus − remboursements. */
export function receivables(sales: SaleLike[]): number {
  return round2(
    sales
      .filter((s) => s.status !== "cancelled")
      .reduce((sum, s) => sum + Math.max(0, num(s.total) - num(s.paid) - num(s.refunded)), 0),
  );
}

export function saleDue(sale: SaleLike): number {
  return round2(Math.max(0, num(sale.total) - num(sale.paid) - num(sale.refunded)));
}

export function saleStatusLabel(sale: SaleLike): {
  label: string;
  tone: "success" | "warning" | "destructive" | "muted";
} {
  if (sale.status === "cancelled") return { label: "Annulée", tone: "muted" };
  if (sale.status === "returned") return { label: "Retournée", tone: "muted" };
  const due = saleDue(sale);
  if (sale.status === "partially_returned")
    return { label: due > 0 ? "Retour partiel · impayé" : "Retour partiel", tone: "warning" };
  if (due <= 0) return { label: "Payée", tone: "success" };
  if (num(sale.paid) > 0) return { label: "Partiellement payée", tone: "warning" };
  return { label: "Impayée", tone: "destructive" };
}

/** Dettes fournisseurs = achats − paiements effectués. */
export function payables(purchases: { total: number | string; paid: number | string }[]): number {
  return round2(
    purchases.reduce((sum, p) => sum + Math.max(0, num(p.total) - num(p.paid)), 0),
  );
}

/** Solde de caisse = solde initial + entrées − sorties. */
export function cashBalance(movements: CashLike[], opening = 0): number {
  return round2(
    movements.reduce(
      (sum, m) => sum + (m.type === "in" ? num(m.amount) : -num(m.amount)),
      num(opening),
    ),
  );
}

export function cashInflow(movements: CashLike[]): number {
  return round2(
    movements.filter((m) => m.type === "in").reduce((s, m) => s + num(m.amount), 0),
  );
}

export function cashOutflow(movements: CashLike[]): number {
  return round2(
    movements.filter((m) => m.type === "out").reduce((s, m) => s + num(m.amount), 0),
  );
}

export function inRange(date: string, from: Date, to: Date): boolean {
  const t = new Date(date).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
