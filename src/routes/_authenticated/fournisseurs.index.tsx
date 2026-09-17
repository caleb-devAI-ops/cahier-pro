import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Truck, Wallet } from "lucide-react";
import { usePurchases, useSuppliers } from "@/lib/db";
import { formatMoney, num } from "@/lib/format";
import { PaymentDialog, SupplierDialog } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/fournisseurs/")({
  validateSearch: (s: Record<string, unknown>): { nouveau?: string } =>
    s["nouveau"] ? { nouveau: String(s["nouveau"]) } : {},
  head: () => ({
    meta: [
      { title: "Fournisseurs — Cahier Pro" },
      { name: "description", content: "Fournisseurs, achats, montants payés et restes dus." },
      { property: "og:title", content: "Fournisseurs — Cahier Pro" },
      { property: "og:description", content: "Suivi des fournisseurs et des dettes." },
    ],
  }),
  component: SuppliersPage,
});

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  note: string | null;
}

function SuppliersPage() {
  const { nouveau } = Route.useSearch();
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const [open, setOpen] = useState(nouveau === "1");
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [paying, setPaying] = useState<{ id: string; due: number } | null>(null);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const stats = (supplierId: string) => {
    const list = purchases.filter(
      (p: { supplier_id: string | null }) => p.supplier_id === supplierId,
    );
    const total = list.reduce((s, p: { total: unknown }) => s + num(p.total), 0);
    const paid = list.reduce((s, p: { paid: unknown }) => s + num(p.paid), 0);
    return { count: list.length, total, paid, due: Math.max(0, total - paid) };
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur(s)`}
        action={
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter
          </button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-8" />}
          title="Aucun fournisseur pour le moment"
          description="Ajoutez vos fournisseurs pour suivre vos achats et vos dettes."
          actionLabel="Ajouter mon premier fournisseur"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3 px-4">
          {suppliers.map((s: SupplierRow) => {
            const st = stats(s.id);
            return (
              <div key={s.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left" onClick={() => { setEditing(s); setOpen(true); }}>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.phone || "Sans téléphone"} · {st.count} achat(s)
                    </p>
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Reste dû</p>
                    <p className={`tabular font-semibold ${st.due > 0 ? "text-destructive" : "text-success"}`}>
                      {formatMoney(st.due)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Acheté : {formatMoney(st.total)}</span>
                  <span>Payé : {formatMoney(st.paid)}</span>
                </div>
                {st.due > 0 ? (
                  <button
                    onClick={() => setPaying({ id: s.id, due: st.due })}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-sm font-semibold"
                  >
                    <Wallet className="size-4" /> Payer le fournisseur
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <SupplierDialog open={open} onClose={() => setOpen(false)} supplier={editing} />
      <PaymentDialog
        open={!!paying}
        onClose={() => setPaying(null)}
        direction="out"
        supplierId={paying?.id ?? null}
        remaining={paying?.due ?? 0}
        title="Payer le fournisseur"
      />
    </div>
  );
}
