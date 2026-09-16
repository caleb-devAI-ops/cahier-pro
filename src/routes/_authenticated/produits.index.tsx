import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { useProducts } from "@/lib/db";
import { formatMoney, formatQty, num } from "@/lib/format";
import { ProductDialog, type ProductRecord } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/produits/")({
  validateSearch: (s: Record<string, unknown>): { nouveau?: string } =>
    s["nouveau"] ? { nouveau: String(s["nouveau"]) } : {},
  head: () => ({
    meta: [
      { title: "Produits — Cahier Pro" },
      { name: "description", content: "Produits, services, prix, marges et niveaux de stock." },
      { property: "og:title", content: "Produits — Cahier Pro" },
      { property: "og:description", content: "Prix, marges et stock de vos produits." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { nouveau } = Route.useSearch();
  const { data = [], isLoading, error } = useProducts();
  const [open, setOpen] = useState(nouveau === "1");
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [q, setQ] = useState("");

  const filtered = data.filter((p) =>
    `${p.name} ${p.sku ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${data.length} produit(s) et service(s)`}
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

      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-card px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="Aucun produit pour le moment"
          description="Ajoutez vos produits ou services pour vendre plus vite."
          actionLabel="Ajouter mon premier produit"
          onAction={() => setOpen(true)}
        />
      ) : null}

      <div className="space-y-3 px-4">
        {filtered.map((p) => {
          const margin = num(p.sale_price) - num(p.cost_price);
          const low = p.track_stock && num(p.stock) <= num(p.min_stock);
          const out = p.track_stock && num(p.stock) <= 0;
          return (
            <button
              key={p.id}
              onClick={() => {
                setEditing(p as unknown as ProductRecord);
                setOpen(true);
              }}
              className="card-surface flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.track_stock ? `${formatQty(p.stock)} ${p.unit} en stock` : "Service (sans stock)"}
                  {p.category ? ` · ${p.category}` : ""}
                </p>
                <div className="mt-1.5 flex gap-2">
                  {out ? <StatusPill label="Rupture" tone="destructive" /> : null}
                  {!out && low ? <StatusPill label="Stock faible" tone="warning" /> : null}
                  <StatusPill label={`Marge ${formatMoney(margin)}`} tone="primary" />
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular">{formatMoney(p.sale_price)}</p>
                <p className="text-xs text-muted-foreground tabular">achat {formatMoney(p.cost_price)}</p>
              </div>
            </button>
          );
        })}
      </div>

      <ProductDialog open={open} onClose={() => setOpen(false)} product={editing} />
    </div>
  );
}
