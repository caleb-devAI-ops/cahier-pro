import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins } from "lucide-react";
import { useSales } from "@/lib/db";
import { receivables, saleDue, saleStatusLabel } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { PaymentDialog } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/a-recevoir")({
  head: () => ({
    meta: [
      { title: "À recevoir — Cahier Pro" },
      { name: "description", content: "Créances clients : soldes restants et encaissements." },
      { property: "og:title", content: "À recevoir — Cahier Pro" },
      { property: "og:description", content: "Créances clients et encaissements." },
    ],
  }),
  component: ReceivablesPage,
});

function ReceivablesPage() {
  const { data = [], isLoading, error } = useSales();
  const [target, setTarget] = useState<{ id: string; customerId: string | null; due: number } | null>(null);

  const unpaid = data.filter((s) => saleDue(s) > 0);
  const total = receivables(data);

  return (
    <div>
      <PageHeader title="À recevoir" subtitle={`Total : ${formatMoney(total)}`} />

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && unpaid.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="size-8" />}
          title="Aucune créance"
          description="Tous vos clients sont à jour."
        />
      ) : null}

      <div className="space-y-3 px-4">
        {unpaid.map((s) => {
          const st = saleStatusLabel(s);
          return (
            <div key={s.id} className="card-surface px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {(s as { customers?: { name?: string } | null }).customers?.name ?? "Client de passage"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.number} · {formatDate(s.sale_date)}
                  </p>
                  <div className="mt-1.5">
                    <StatusPill label={st.label} tone={st.tone} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular text-destructive">{formatMoney(saleDue(s))}</p>
                  <p className="text-xs text-muted-foreground tabular">sur {formatMoney(s.total)}</p>
                </div>
              </div>
              <button
                onClick={() => setTarget({ id: s.id, customerId: s.customer_id, due: saleDue(s) })}
                className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Encaisser
              </button>
            </div>
          );
        })}
      </div>

      <PaymentDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        direction="in"
        saleId={target?.id ?? null}
        customerId={target?.customerId ?? null}
        remaining={target?.due ?? 0}
      />
    </div>
  );
}
