import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useActivity } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({
    meta: [
      { title: "Historique — Cahier Pro" },
      { name: "description", content: "Toutes vos opérations : ventes, paiements, dépenses, retours." },
      { property: "og:title", content: "Historique — Cahier Pro" },
      { property: "og:description", content: "Toutes vos opérations enregistrées." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data = [], isLoading, error } = useActivity();

  return (
    <div>
      <PageHeader title="Historique" subtitle={`${data.length} opération(s)`} />

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={<History className="size-8" />}
          title="Aucune opération"
          description="Vos ventes, paiements et dépenses apparaîtront ici."
        />
      ) : null}

      <div className="space-y-2 px-4">
        {data.map((a: Record<string, any>) => (
          <div key={a.id} className="card-surface flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(a.created_at)} · {a.type}
              </p>
            </div>
            {a.amount != null ? (
              <span className="shrink-0 text-sm font-semibold tabular">{formatMoney(a.amount)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
