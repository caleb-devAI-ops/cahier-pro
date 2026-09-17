import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCashClosures, useCashTransactions, useProfile, useRpc } from "@/lib/db";
import { cashBalance, cashInflow, cashOutflow, inRange } from "@/lib/finance";
import { formatDate, formatDateTime, formatMoney, num } from "@/lib/format";
import { dayKey, resolvePeriod } from "@/lib/periods";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui-bits";
import { Modal, SubmitButton, TextArea } from "@/components/modal";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse — Cahier Pro" },
      { name: "description", content: "Solde de caisse, entrées, sorties et clôture quotidienne." },
      { property: "og:title", content: "Caisse — Cahier Pro" },
      { property: "og:description", content: "Suivez votre caisse au quotidien." },
    ],
  }),
  component: CashPage,
});

function CashPage() {
  const { data: movements = [], isLoading, error } = useCashTransactions();
  const { data: closures = [] } = useCashClosures();
  const { data: profile } = useProfile();
  const closeCash = useRpc<Record<string, unknown>>("close_cash");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const today = resolvePeriod("today");
  const todayMovements = movements.filter((m: { occurred_at: string }) =>
    inRange(m.occurred_at, today.from, today.to),
  );
  const balance = cashBalance(movements as never, num(profile?.opening_cash));
  const todayClosed = closures.some(
    (c: { closure_date: string }) => c.closure_date === dayKey(new Date()),
  );

  async function submitClosure(e: React.FormEvent) {
    e.preventDefault();
    try {
      await closeCash.mutateAsync({ p_date: dayKey(new Date()), p_note: note || null });
      toast.success("Caisse clôturée pour aujourd'hui");
      setOpen(false);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="pb-6">
      <PageHeader title="Caisse" subtitle="Solde initial + entrées − sorties" />

      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard label="Solde de caisse" value={formatMoney(balance)} tone="primary" />
        <StatCard label="Solde initial" value={formatMoney(profile?.opening_cash ?? 0)} />
        <StatCard
          label="Entrées aujourd'hui"
          value={formatMoney(cashInflow(todayMovements as never))}
          tone="positive"
        />
        <StatCard
          label="Sorties aujourd'hui"
          value={formatMoney(cashOutflow(todayMovements as never))}
          tone="negative"
        />
      </div>

      <div className="px-4 pt-4">
        <button
          onClick={() => setOpen(true)}
          disabled={todayClosed}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Lock className="size-4" />
          {todayClosed ? "Caisse déjà clôturée aujourd'hui" : "Clôturer la caisse du jour"}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mouvements
        </h2>
        {movements.length === 0 ? (
          <EmptyState
            title="Aucun mouvement de caisse"
            description="Les ventes encaissées, achats et dépenses apparaîtront ici."
          />
        ) : (
          <div className="card-surface mx-4 divide-y divide-border">
            {movements.slice(0, 80).map((m: Record<string, unknown>) => (
              <div key={String(m["id"])} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`rounded-full p-2 ${
                    m["type"] === "in" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {m["type"] === "in" ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{String(m["description"] ?? "Mouvement")}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(m["number"] ?? "")} · {formatDateTime(String(m["occurred_at"]))}
                  </p>
                </div>
                <span
                  className={`tabular text-sm font-semibold ${
                    m["type"] === "in" ? "text-success" : "text-destructive"
                  }`}
                >
                  {m["type"] === "in" ? "+" : "−"} {formatMoney(m["amount"])}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {closures.length > 0 ? (
        <section className="mt-6">
          <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clôtures
          </h2>
          <div className="card-surface mx-4 divide-y divide-border">
            {closures.map((c: Record<string, unknown>) => (
              <div key={String(c["id"])} className="px-4 py-3 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{formatDate(String(c["closure_date"]))}</span>
                  <span className="tabular">{formatMoney(c["closing"])}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ouverture {formatMoney(c["opening"])} · Entrées {formatMoney(c["inflow"])} · Sorties{" "}
                  {formatMoney(c["outflow"])}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Clôture de caisse">
        <form onSubmit={submitClosure} className="space-y-4">
          <div className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Solde calculé à la clôture : <strong className="tabular">{formatMoney(balance)}</strong>
          </div>
          <TextArea label="Note (facultatif)" value={note} onChange={setNote} />
          <SubmitButton loading={closeCash.isPending}>Clôturer la journée</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
