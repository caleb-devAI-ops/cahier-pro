import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCustomers, useProducts, useRpc } from "@/lib/db";
import { PAYMENT_METHODS, formatMoney, formatQty, num, round2 } from "@/lib/format";
import { SelectField, TextArea, TextField } from "@/components/modal";

export const Route = createFileRoute("/_authenticated/ventes/nouvelle")({
  head: () => ({
    meta: [
      { title: "Nouvelle vente — Cahier Pro" },
      { name: "description", content: "Enregistrez une vente en quelques secondes." },
      { property: "og:title", content: "Nouvelle vente — Cahier Pro" },
      { property: "og:description", content: "Client, produits, remise, paiement : tout en une étape." },
    ],
  }),
  component: NewSale,
});

interface Line {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  stock: number;
  track_stock: boolean;
}

function NewSale() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const createSale = useRpc<Record<string, unknown>, { id: string; number: string }>("create_sale");

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("especes");
  const [note, setNote] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [picker, setPicker] = useState("");

  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const total = round2(subtotal - num(discount));
  const due = round2(total - num(paid));
  const cost = round2(lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0));
  const margin = round2(total - cost);

  const stockIssue = useMemo(
    () => lines.some((l) => l.track_stock && l.quantity > l.stock),
    [lines],
  );

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setPicker("");
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === id);
      if (existing) {
        return prev.map((l) => (l.product_id === id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          quantity: 1,
          unit_price: num(p.sale_price),
          unit_cost: num(p.cost_price),
          stock: num(p.stock),
          track_stock: p.track_stock,
        },
      ];
    });
  }

  function update(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return toast.error("Ajoutez au moins un produit");
    if (total < 0) return toast.error("La remise dépasse le sous-total");
    if (num(paid) > total) return toast.error("Le montant payé dépasse le total");
    if (stockIssue && !allowNegative)
      return toast.error("Stock insuffisant : confirmez la vente au-delà du stock disponible");
    try {
      const result = await createSale.mutateAsync({
        p_items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_cost: l.unit_cost,
        })),
        p_customer_id: customerId || null,
        p_discount: num(discount),
        p_paid: num(paid),
        p_method: method,
        p_note: note || null,
        p_allow_negative_stock: allowNegative,
      });
      toast.success(`Vente ${result.number} enregistrée`);
      navigate({ to: "/ventes/$id", params: { id: result.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvelle vente</h1>

      <SelectField
        label="Client"
        value={customerId}
        onChange={setCustomerId}
        options={[
          { value: "", label: "Client de passage" },
          ...customers.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />

      <SelectField
        label="Ajouter un produit ou service"
        value={picker}
        onChange={addProduct}
        options={[
          { value: "", label: products.length ? "Choisir…" : "Aucun produit enregistré" },
          ...products.map((p) => ({
            value: p.id,
            label: `${p.name} — ${formatMoney(p.sale_price)}${p.track_stock ? ` (${formatQty(p.stock)} en stock)` : ""}`,
          })),
        ]}
      />

      {lines.length > 0 ? (
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.product_id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.name}</p>
                  {l.track_stock ? (
                    <p className="text-xs text-muted-foreground">
                      Stock : {formatQty(l.stock)}
                      {l.quantity > l.stock ? " · insuffisant" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Service (sans stock)</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))}
                  className="rounded-full bg-muted p-2 text-muted-foreground"
                  aria-label="Retirer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-input px-2 py-1">
                  <button
                    type="button"
                    onClick={() => update(l.product_id, { quantity: Math.max(1, l.quantity - 1) })}
                    className="rounded-full p-1.5"
                    aria-label="Moins"
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => update(l.product_id, { quantity: Math.max(0, Number(e.target.value)) })}
                    className="w-12 bg-transparent text-center text-sm outline-none tabular"
                  />
                  <button
                    type="button"
                    onClick={() => update(l.product_id, { quantity: l.quantity + 1 })}
                    className="rounded-full p-1.5"
                    aria-label="Plus"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={l.unit_price}
                  onChange={(e) => update(l.product_id, { unit_price: num(e.target.value) })}
                  className="w-28 rounded-2xl border border-input bg-background px-3 py-2 text-sm tabular outline-none"
                />
                <span className="ml-auto font-semibold tabular">
                  {formatMoney(l.quantity * l.unit_price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Aucun produit ajouté pour l'instant.
        </p>
      )}

      <TextField label="Remise (HTG)" value={discount} onChange={setDiscount} type="number" step="0.01" inputMode="decimal" />
      <TextField label="Montant payé (HTG)" value={paid} onChange={setPaid} type="number" step="0.01" inputMode="decimal" />
      <SelectField label="Mode de paiement" value={method} onChange={setMethod} options={[...PAYMENT_METHODS]} />
      <TextArea label="Note" value={note} onChange={setNote} />

      <div className="card-surface divide-y divide-border">
        <Row label="Sous-total" value={formatMoney(subtotal)} />
        <Row label="Remise" value={`− ${formatMoney(num(discount))}`} />
        <Row label="Total" value={formatMoney(total)} strong />
        <Row label="Reste à payer" value={formatMoney(Math.max(0, due))} />
        <Row label="Marge brute estimée" value={formatMoney(margin)} />
      </div>

      {stockIssue ? (
        <label className="flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={allowNegative}
            onChange={(e) => setAllowNegative(e.target.checked)}
            className="mt-0.5 size-5 accent-[var(--color-primary)]"
          />
          <span>Je confirme vendre plus que le stock disponible.</span>
        </label>
      ) : null}

      <button
        type="submit"
        disabled={createSale.isPending}
        className="mb-6 w-full rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
      >
        {createSale.isPending ? "Enregistrement…" : `Confirmer la vente · ${formatMoney(total)}`}
      </button>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={`text-sm ${strong ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`tabular text-sm ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
