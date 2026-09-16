/** Périodes de filtrage partagées par le tableau de bord et les rapports. */

export type PeriodKey =
  | "today"
  | "week"
  | "last7"
  | "month"
  | "last_month"
  | "custom";

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "last7", label: "7 derniers jours" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "last_month", label: "Mois précédent" },
  { key: "custom", label: "Personnalisée" },
];

export function resolvePeriod(
  key: PeriodKey,
  custom?: { from?: string; to?: string },
): PeriodRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: "Aujourd'hui" };
    case "last7": {
      const from = startOfDay(new Date(now));
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now), label: "7 derniers jours" };
    }
    case "week": {
      const from = startOfDay(new Date(now));
      const day = (from.getDay() + 6) % 7; // lundi = 0
      from.setDate(from.getDate() - day);
      return { from, to: endOfDay(now), label: "Cette semaine" };
    }
    case "month": {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return { from, to: endOfDay(now), label: "Ce mois" };
    }
    case "last_month": {
      const from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { from, to, label: "Mois précédent" };
    }
    case "custom": {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : startOfDay(now);
      const to = custom?.to ? endOfDay(new Date(custom.to)) : endOfDay(now);
      return { from, to, label: "Période personnalisée" };
    }
  }
}

export function toISO(d: Date): string {
  return d.toISOString();
}

export function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
