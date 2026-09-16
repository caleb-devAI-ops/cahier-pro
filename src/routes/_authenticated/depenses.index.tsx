import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { useExpenses } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ExpenseDialog } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/depenses/")({
  validateSearch: (s: Record<string, unknown>): { nouveau?: string } =>
    s["nouveau"] ? { nouveau: String(s["nouveau"]) } : {},
  head: () => ({
    meta: [
      { title: "Dépenses — Cahier Pro" },
      { name: "description", content: "Suivez vos dépenses professionnelles par catégorie." },
      { property: "og:title", content: "Dépenses — Cahier Pro" },
      { property: "og:description", content: "Dépenses professionnelles par catégorie." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { nouveau } = Route.useSearch();
  const { data = [], isLoading, error } = useExpenses();
  const [open, setOpen] = useState(nouveau === "1");

  return (
    <div>
      <PageHeader
        title="Dépenses"
        subtitle={`${data.length} dépense(s)`}
        action={
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Ajouter
          </button>
        }
      />

      {error ? <ErrorState message={error.message} /> : null}
      {isLoading ? <LoadingList /> : null}

      {!isLoading && data.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-8" />}
          title="Aucune dépense pour le moment"
          description="Enregistrez vos dépenses pour connaître votre bénéfice net."
          actionLabel="Ajouter ma première dépense"
          onAction={() => setOpen(true)}
        />
      ) : null}

      <div className="space-y-3 px-4">
        {data.map((e) => (
          <div key={e.id} className="card-surface flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{e.description}</p>
              <p className="text-xs text-muted-foreground">
                {e.number} · {formatDate(e.expense_date)} · {e.category}
              </p>
            </div>
            <span className="shrink-0 font-semibold tabular text-destructive">
              − {formatMoney(e.amount)}
            </span>
          </div>
        ))}
      </div>

      <ExpenseDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
