/**
 * Moteur d'unités : conversions définies par l'utilisateur, jamais devinées.
 * Une conversion "1 from = factor to" est utilisable dans les deux sens et
 * peut être chaînée (gallon → oz → ml…).
 */

export const DEFAULT_UNITS = [
  "unité", "pièce", "g", "kg", "ml", "L", "oz", "lb", "gallon", "demi-gallon",
  "bidon", "bouteille", "boîte", "paquet", "carton", "sac",
] as const;

export const SERVICE_UNITS = ["heure", "séance", "projet", "intervention", "abonnement", "autre"] as const;

export interface Conversion {
  from_unit: string;
  to_unit: string;
  factor: number | string;
  product_id?: string | null;
}

export const UNKNOWN_CONVERSION =
  "Conversion inconnue. Veuillez définir la relation entre ces unités.";

export class ConversionError extends Error {
  constructor() {
    super(UNKNOWN_CONVERSION);
  }
}

const norm = (u: string) => u.trim().toLowerCase();

/**
 * Facteur multiplicatif pour passer de `from` à `to`, ou null si aucune
 * relation connue. Les conversions propres au produit sont prioritaires.
 */
export function conversionFactor(
  from: string,
  to: string,
  conversions: Conversion[],
  productId?: string | null,
): number | null {
  const a = norm(from);
  const b = norm(to);
  if (!a || !b) return null;
  if (a === b) return 1;
  const usable = conversions.filter((c) => !c.product_id || c.product_id === productId);
  // Les règles spécifiques au produit écrasent les règles générales.
  usable.sort((x, y) => Number(!!x.product_id) - Number(!!y.product_id));
  const graph = new Map<string, Map<string, number>>();
  const link = (x: string, y: string, f: number) => {
    if (!graph.has(x)) graph.set(x, new Map());
    graph.get(x)!.set(y, f);
  };
  for (const c of usable) {
    const f = Number(c.factor);
    if (!Number.isFinite(f) || f <= 0) continue;
    link(norm(c.from_unit), norm(c.to_unit), f);
    link(norm(c.to_unit), norm(c.from_unit), 1 / f);
  }
  const seen = new Set([a]);
  const queue: Array<[string, number]> = [[a, 1]];
  while (queue.length) {
    const [node, acc] = queue.shift()!;
    for (const [next, f] of graph.get(node) ?? []) {
      if (seen.has(next)) continue;
      const v = acc * f;
      if (next === b) return v;
      seen.add(next);
      queue.push([next, v]);
    }
  }
  return null;
}

/** Convertit une quantité ; lève ConversionError si la relation est inconnue. */
export function convert(
  qty: number,
  from: string,
  to: string,
  conversions: Conversion[],
  productId?: string | null,
): number {
  const f = conversionFactor(from, to, conversions, productId);
  if (f === null) throw new ConversionError();
  return qty * f;
}

/**
 * Combien de `target` entiers tiennent dans `qty from`, et le reste exprimé
 * dans l'unité `from`. Ex. 1 gallon → 6 bidons + 8 oz (si from = oz).
 */
export function decompose(
  qty: number,
  from: string,
  target: string,
  conversions: Conversion[],
  productId?: string | null,
): { count: number; remainder: number } {
  const size = convert(1, target, from, conversions, productId);
  const EPS = 1e-9;
  const count = Math.floor(qty / size + EPS);
  const remainder = Math.max(0, qty - count * size);
  return { count, remainder: Math.abs(remainder) < EPS ? 0 : remainder };
}
