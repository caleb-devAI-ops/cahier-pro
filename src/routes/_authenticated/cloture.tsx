import { createFileRoute } from "@tanstack/react-router";
import { useCashClosures } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, num } from "@/lib/format";
import { CloseDayButton, DailyClosureSummary, useDailyClosure } from "@/components/daily-closure";
import { EmptyState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/cloture")({
  head: () => ({
    meta: [
      { title: "Clôture de caisse — Cahier Pro" },
      {
        name: "description",
        content: "Récapitulatif du jour, validation du bilan et historique de toutes vos clôtures.",
      },
      { property: "og:title", content: "Clôture de caisse — Cahier Pro" },
      { property: "og:description", content: "Validez et conservez le bilan de chaque journée." },
    ],
  }),
  component: ClosurePage,
});

function ClosurePage() {
  const day = useDailyClosure();
  const { data: closures = [] } = useCashClosures();

  if (day.isLoading) return <LoadingList />;

  return (
    <div className="pb-6">
      <PageHeader
        title="Clôture de caisse"
        subtitle={day.isClosed ? "Journée déjà clôturée" : "Bilan de la journée en cours"}
      />

      <section>
        <h2 className="flex items-center justify-between px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Récapitulatif du jour
          {day.isClosed ? <StatusPill label="Clôturée" tone="success" /> : null}
        </h2>
        <DailyClosureSummary day={day} />
      </section>

      <div className="px-4 pt-4">
        <CloseDayButton day={day} />
      </div>

      <section className="mt-6">
        <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historique des clôtures
        </h2>
        {closures.length === 0 ? (
          <EmptyState
            title="Aucune journée clôturée"
            description="Validez le bilan du soir pour conserver l'historique de vos journées."
          />
        ) : (
          <div className="space-y-3 px-4">
            {(closures as Record<string, unknown>[]).map((c) => {
              const v = num(c["variance"]);
              const counted = c["counted"];
              return (
                <div key={String(c["id"])} className="card-surface p-4 text-sm">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{formatDate(String(c["closure_date"]))}</span>
                    <span className="tabular">{formatMoney(c["closing"])}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Ouverture : {formatMoney(c["opening"])}</span>
                    <span>Ventes : {formatMoney(c["sales_total"])}</span>
                    <span>Entrées : {formatMoney(c["inflow"])}</span>
                    <span>Sorties : {formatMoney(c["outflow"])}</span>
                    <span>Paiements reçus : {formatMoney(c["payments_in"])}</span>
                    <span>Dépenses : {formatMoney(c["expenses_total"])}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {counted === null || counted === undefined ? (
                      <StatusPill label="Caisse non comptée" tone="muted" />
                    ) : (
                      <>
                        <StatusPill label={`Compté ${formatMoney(counted)}`} tone="primary" />
                        <StatusPill
                          label={v === 0 ? "Aucun écart" : `Écart ${formatMoney(v)}`}
                          tone={v === 0 ? "success" : "warning"}
                        />
                      </>
                    )}
                    {c["closed_at"] ? (
                      <span className="text-xs text-muted-foreground">
                        Validée le {formatDateTime(String(c["closed_at"]))}
                      </span>
                    ) : null}
                  </div>
                  {c["note"] ? <p className="mt-2 text-xs text-muted-foreground">{String(c["note"])}</p> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
