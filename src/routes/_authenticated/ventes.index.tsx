import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useSales } from "@/lib/db";
import { saleDue, saleStatusLabel } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/ventes/")({
  head: () => ({
    meta: [
      { title: "Ventes — Cahier Pro" },
      { name: "description", content: "Historique de vos ventes, paiements et reçus." },
      { property: "og:title", content: "Ventes — Cahier Pro" },
      { property: "og:description", content: "Historique de vos ventes et reçus." },
    ],
  }),
  component: SalesList,
});

function SalesList() {
  const { data = [], isLoading, error } = useSales();
  const [q, setQ] = useState("");

  const filtered = data.filter((s) => {
    const name = (s as { customers?: { name?: string } | null }).customers?.name ?? "";
    return `${s.number} ${name}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Ventes"
        subtitle={`${data.length} vente(s) enregistrée(s)`}
        action={
          <Link
            to="/ventes/nouvelle"
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Vendre
          </Link>
        }
      />

      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-card px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une vente ou un client"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && data.length === 0 ? (
        <EmptyState
          title="Aucune vente pour le moment"
          description="Enregistrez votre première vente en quelques secondes."
          actionLabel="Nouvelle vente"
          to="/ventes/nouvelle"
        />
      ) : null}

      {!isLoading && data.length > 0 && filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre mot-clé." />
      ) : null}

      <div className="space-y-3 px-4">
        {filtered.map((s) => {
          const status = saleStatusLabel(s);
          const due = saleDue(s);
          return (
            <Link
              key={s.id}
              to="/ventes/$id"
              params={{ id: s.id }}
              className="card-surface flex items-center gap-3 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {(s as { customers?: { name?: string } | null }).customers?.name ?? "Client de passage"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.number} · {formatDate(s.sale_date)}
                </p>
                <div className="mt-1.5">
                  <StatusPill label={status.label} tone={status.tone} />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular">{formatMoney(s.total)}</p>
                {due > 0 ? (
                  <p className="mt-0.5 text-xs text-destructive tabular">Reste {formatMoney(due)}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
