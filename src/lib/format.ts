/** Formatage centralisé — devise, nombres et dates. */

export const DEFAULT_CURRENCY = "HTG";

/** Convertit une valeur numérique renvoyée par la base (string ou number) en nombre sûr. */
export function num(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Arrondi monétaire à 2 décimales, sans erreur de virgule flottante visible. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: unknown, currency = DEFAULT_CURRENCY): string {
  const n = round2(num(value));
  const formatted = n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatMoneyShort(value: unknown, currency = DEFAULT_CURRENCY): string {
  const n = round2(num(value));
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k ${currency}`;
  return formatMoney(n, currency);
}

export function formatQty(value: unknown): string {
  const n = num(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayLabel(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "transfert", label: "Transfert" },
  { value: "mobile", label: "Paiement mobile" },
  { value: "autre", label: "Autre" },
] as const;

export function paymentMethodLabel(value: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "—";
}

export const EXPENSE_CATEGORIES = [
  "transport",
  "internet",
  "electricite",
  "materiel",
  "marketing",
  "salaire",
  "loyer",
  "emballage",
  "entretien",
  "autres",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport",
  internet: "Internet",
  electricite: "Électricité",
  materiel: "Matériel",
  marketing: "Marketing",
  salaire: "Salaire",
  loyer: "Loyer",
  emballage: "Emballage",
  entretien: "Entretien",
  autres: "Autres",
};
