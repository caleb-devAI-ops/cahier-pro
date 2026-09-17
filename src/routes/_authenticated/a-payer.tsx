import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins } from "lucide-react";
import { usePurchases } from "@/lib/db";
import { payables } from "@/lib/finance";
import { formatDate, formatMoney, num } from "@/lib/format";
import { PaymentDialog } from "@/components/forms";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatCard, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/a-payer")({
  head: () => ({
    meta: [
      { title: "À payer — Cahier Pro" },
      { name: "description", content: "Dettes fournisseurs : soldes restants et paiements." },
      { property: "og:title", content: "À payer — Cahier Pro" },
      { property: "og:description", content: "Suivez et réglez vos dettes fournisseurs." },
    ],
  }),
  component: PayablesPage,
});

function PayablesPage() {
  const { data: purchases = [], isLoading, error } = usePurchases();
  const [paying, setPaying] = useState<{ purchaseId: string; supplierId: string | null; due: number } | null>(null);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const open = purchases.filter(
    (p: Record<string, unknown>) => num(p["total"]) - num(p["paid"]) > 0,
  );
  const total = payables(
    purchases as unknown as { total: number | string; paid: number | string }[],
  );

  return (
    <div className="pb-6">
      <PageHeader title="À payer" subtitle="Dettes fournisseurs" />
      <div className="px-4 pb-4">
        <StatCard label="Total à payer" value={formatMoney(total)} tone="negative" />
      </div>

      {open.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="size-8" />}
          title="Aucune dette fournisseur"
          description="Tous vos achats sont réglés."
        />
      ) : (
        <div className="space-y-3 px-4">
          {open.map((p: Record<string, unknown>) => {
            const due = num(p["total"]) - num(p["paid"]);
            const supplier = (p["suppliers"] as { name?: string } | null)?.name ?? "Sans fournisseur";
            return (
              <div key={String(p["id"])} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{supplier}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(p["number"])} · {formatDate(String(p["purchase_date"]))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-semibold text-destructive">{formatMoney(due)}</p>
                    <StatusPill
                      label={num(p["paid"]) > 0 ? "Partiellement payé" : "Impayé"}
                      tone={num(p["paid"]) > 0 ? "warning" : "destructive"}
                    />
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Total : {formatMoney(p["total"])}</span>
                  <span>Payé : {formatMoney(p["paid"])}</span>
                </div>
                <button
                  onClick={() =>
                    setPaying({
                      purchaseId: String(p["id"]),
                      supplierId: (p["supplier_id"] as string | null) ?? null,
                      due,
                    })
                  }
                  className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Enregistrer un paiement
                </button>
              </div>
            );
          })}
        </div>
      )}

      <PaymentDialog
        open={!!paying}
        onClose={() => setPaying(null)}
        direction="out"
        purchaseId={paying?.purchaseId ?? null}
        supplierId={paying?.supplierId ?? null}
        remaining={paying?.due}
        title="Payer le fournisseur"
      />
    </div>
  );
}
