import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProducts, usePurchases, useRpc, useSuppliers } from "@/lib/db";
import { formatDate, formatMoney, num, paymentMethodLabel, PAYMENT_METHODS } from "@/lib/format";
import { Modal, SelectField, SubmitButton, TextArea, TextField } from "@/components/modal";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/achats/")({
  validateSearch: (s: Record<string, unknown>): { nouveau?: string } =>
    s["nouveau"] ? { nouveau: String(s["nouveau"]) } : {},
  head: () => ({
    meta: [
      { title: "Achats — Cahier Pro" },
      { name: "description", content: "Achats fournisseurs : coûts, stock reçu et dettes." },
      { property: "og:title", content: "Achats — Cahier Pro" },
      { property: "og:description", content: "Enregistrez vos achats et mettez à jour le stock." },
    ],
  }),
  component: PurchasesPage,
});

interface Line {
  product_id: string;
  quantity: string;
  unit_cost: string;
}

function PurchasesPage() {
  const { nouveau } = Route.useSearch();
  const { data: purchases = [], isLoading, error } = usePurchases();
  const [open, setOpen] = useState(nouveau === "1");

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="pb-6">
      <PageHeader
        title="Achats"
        subtitle={`${purchases.length} achat(s) enregistré(s)`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Nouvel achat
          </button>
        }
      />

      {purchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-8" />}
          title="Aucun achat pour le moment"
          description="Enregistrez un achat : le stock augmente et la dette fournisseur est mise à jour."
          actionLabel="Enregistrer mon premier achat"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3 px-4">
          {purchases.map((p: Record<string, unknown>) => {
            const due = Math.max(0, num(p["total"]) - num(p["paid"]));
            const supplier = (p["suppliers"] as { name?: string } | null)?.name ?? "Sans fournisseur";
            const items = (p["purchase_items"] as Array<Record<string, unknown>>) ?? [];
            return (
              <div key={String(p["id"])} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{supplier}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(p["number"])} · {formatDate(String(p["purchase_date"]))} ·{" "}
                      {paymentMethodLabel(String(p["payment_method"] ?? ""))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-semibold">{formatMoney(p["total"])}</p>
                    <StatusPill
                      label={due > 0 ? `Reste ${formatMoney(due)}` : "Payé"}
                      tone={due > 0 ? "warning" : "success"}
                    />
                  </div>
                </div>
                <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-2 text-xs text-muted-foreground">
                  {items.map((it) => (
                    <li key={String(it["id"])} className="flex justify-between">
                      <span>
                        {String(it["product_name"])} × {num(it["quantity"])}
                      </span>
                      <span className="tabular">{formatMoney(it["line_total"])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <PurchaseDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function PurchaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const rpc = useRpc<Record<string, unknown>>("create_purchase", { offlineLabel: "Achat" });
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "1", unit_cost: "" }]);
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("especes");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSupplierId("");
    setLines([{ product_id: "", quantity: "1", unit_cost: "" }]);
    setPaid("");
    setMethod("especes");
    setNote("");
  }, [open]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + num(l.quantity) * num(l.unit_cost), 0),
    [lines],
  );
  const due = Math.max(0, total - num(paid));

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = lines
      .filter((l) => l.product_id && num(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: num(l.quantity),
        unit_cost: num(l.unit_cost),
      }));
    if (payload.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }
    if (num(paid) > total) {
      toast.error("Le montant payé dépasse le total de l'achat");
      return;
    }
    try {
      const res = (await rpc.mutateAsync({
        p_items: payload,
        p_supplier_id: supplierId || null,
        p_paid: num(paid),
        p_method: method,
        p_note: note || null,
      })) as { queued?: boolean };
      toast.success(
        res?.queued
          ? "Achat enregistré hors ligne — envoi au retour du réseau"
          : "Achat enregistré, stock mis à jour",
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  const productOptions = [
    { value: "", label: "Choisir un produit" },
    ...products.map((p: { id: string; name: string }) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Nouvel achat">
      <form onSubmit={submit} className="space-y-4">
        <SelectField
          label="Fournisseur"
          value={supplierId}
          onChange={setSupplierId}
          options={[
            { value: "", label: "Sans fournisseur" },
            ...suppliers.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name })),
          ]}
        />

        {lines.map((line, i) => (
          <div key={i} className="rounded-2xl border border-input p-3">
            <SelectField
              label={`Produit ${i + 1}`}
              value={line.product_id}
              onChange={(v) => {
                const p = products.find((x: { id: string }) => x.id === v) as
                  | { cost_price?: unknown }
                  | undefined;
                updateLine(i, {
                  product_id: v,
                  unit_cost: line.unit_cost || (p ? String(num(p.cost_price)) : ""),
                });
              }}
              options={productOptions}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TextField
                label="Quantité"
                value={line.quantity}
                onChange={(v) => updateLine(i, { quantity: v })}
                type="number"
                inputMode="decimal"
              />
              <TextField
                label="Prix d'achat unitaire"
                value={line.unit_cost}
                onChange={(v) => updateLine(i, { unit_cost: v })}
                type="number"
                step="0.01"
                inputMode="decimal"
              />
            </div>
            {lines.length > 1 ? (
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive"
              >
                <Trash2 className="size-3.5" /> Retirer
              </button>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, { product_id: "", quantity: "1", unit_cost: "" }])}
          className="w-full rounded-full bg-secondary py-2.5 text-sm font-semibold"
        >
          + Ajouter un produit
        </button>

        <div className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          <div className="flex justify-between">
            <span>Coût total</span>
            <strong className="tabular">{formatMoney(total)}</strong>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Reste à payer</span>
            <strong className="tabular">{formatMoney(due)}</strong>
          </div>
        </div>

        <TextField
          label="Montant payé (HTG)"
          value={paid}
          onChange={setPaid}
          type="number"
          step="0.01"
          inputMode="decimal"
        />
        <SelectField label="Mode de paiement" value={method} onChange={setMethod} options={[...PAYMENT_METHODS]} />
        <TextArea label="Note" value={note} onChange={setNote} />
        <SubmitButton loading={rpc.isPending}>Enregistrer l'achat</SubmitButton>
      </form>
    </Modal>
  );
}
