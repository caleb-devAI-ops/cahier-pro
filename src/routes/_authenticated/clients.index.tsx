import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { useCustomers, useSales } from "@/lib/db";
import { receivables } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { CustomerDialog } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/clients/")({
  validateSearch: (s: Record<string, unknown>) => ({ nouveau: (s["nouveau"] as string) || undefined }),
  head: () => ({
    meta: [
      { title: "Clients — Cahier Pro" },
      { name: "description", content: "Vos clients, leurs achats, paiements et dettes." },
      { property: "og:title", content: "Clients — Cahier Pro" },
      { property: "og:description", content: "Vos clients, leurs achats et leurs dettes." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { nouveau } = Route.useSearch();
  const { data = [], isLoading, error } = useCustomers();
  const { data: sales = [] } = useSales();
  const [open, setOpen] = useState(nouveau === "1");
  const [q, setQ] = useState("");

  const filtered = data.filter((c) =>
    `${c.name} ${c.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${data.length} client(s)`}
        action={
          <button
            onClick={() => setOpen(true)}
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
            placeholder="Rechercher un client"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title="Aucun client pour le moment"
          description="Ajoutez vos clients pour suivre leurs achats et leurs dettes."
          actionLabel="Ajouter mon premier client"
          onAction={() => setOpen(true)}
        />
      ) : null}

      <div className="space-y-3 px-4">
        {filtered.map((c) => {
          const cs = sales.filter((s) => s.customer_id === c.id);
          const due = receivables(cs);
          return (
            <Link
              key={c.id}
              to="/clients/$id"
              params={{ id: c.id }}
              className="card-surface flex items-center gap-3 px-4 py-3.5"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                {c.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone || "Sans téléphone"}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold tabular ${due > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {due > 0 ? formatMoney(due) : "À jour"}
                </p>
                <p className="text-xs text-muted-foreground">{cs.length} vente(s)</p>
              </div>
            </Link>
          );
        })}
      </div>

      <CustomerDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
