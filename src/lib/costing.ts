/**
 * Calculs de coûts et de rentabilité — partagés par produits, ventes,
 * production, stock et tableau de bord. Aucun arrondi interne.
 */

export const COST_FIELDS = [
  { key: "transport", label: "Transport" },
  { key: "delivery", label: "Livraison" },
  { key: "packaging", label: "Emballage" },
  { key: "taxes", label: "Taxes" },
  { key: "commission", label: "Commission" },
  { key: "labor", label: "Main-d'œuvre" },
  { key: "other", label: "Autres coûts" },
] as const;

export type CostKey = (typeof COST_FIELDS)[number]["key"];
export type CostBreakdown = Partial<Record<CostKey, number>>;

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function extraCosts(b: CostBreakdown): number {
  return COST_FIELDS.reduce((s, f) => s + n(b[f.key]), 0);
}

/**
 * Prix d'achat = payé au fournisseur ; acquisition = achat + transport + livraison + taxes + commission ;
 * coût de revient = tous les coûts ; coût unitaire = revient / quantité obtenue.
 * Renvoie unitCost = null si la quantité est inconnue ou nulle (jamais de division par zéro).
 */
export function computeCosts(purchasePrice: number, qty: number, b: CostBreakdown) {
  const acquisition =
    n(purchasePrice) + n(b.transport) + n(b.delivery) + n(b.taxes) + n(b.commission);
  const total = n(purchasePrice) + extraCosts(b);
  const unitCost = n(qty) > 0 ? total / n(qty) : null;
  return { purchasePrice: n(purchasePrice), acquisition, total, unitCost };
}

/** Bénéfice, marge % (sur prix) et markup % (sur coût). */
export function profitability(unitCost: number, price: number) {
  const profit = n(price) - n(unitCost);
  return {
    profit,
    marginPct: n(price) > 0 ? (profit / n(price)) * 100 : null,
    markupPct: n(unitCost) > 0 ? (profit / n(unitCost)) * 100 : null,
  };
}

export function formatPct(v: number | null): string {
  return v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} %`;
}

export const PRODUCT_TYPES = [
  { value: "resale", label: "Produit acheté / revendu" },
  { value: "manufactured", label: "Produit fabriqué" },
  { value: "composite", label: "Produit composé" },
  { value: "raw_material", label: "Matière première" },
  { value: "service", label: "Service" },
  { value: "other", label: "Autre" },
] as const;

export function productTypeLabel(v: string | null | undefined) {
  return PRODUCT_TYPES.find((t) => t.value === v)?.label ?? "Produit";
}

/** Stock disponible = actuel − réservé. */
export function availableStock(stock: unknown, reserved: unknown) {
  return n(stock) - n(reserved);
}
