import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Lock, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useCashClosures,
  useCashTransactions,
  useExpenses,
  usePayments,
  useProfile,
  useRpc,
  useSales,
} from "@/lib/db";
import { cashBalance, cashInflow, cashOutflow, inRange, revenue, totalExpenses } from "@/lib/finance";
import { formatDate, formatDateTime, formatMoney, num, round2 } from "@/lib/format";
import { dayKey, resolvePeriod } from "@/lib/periods";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatCard, StatusPill } from "@/components/ui-bits";
import { Modal, SubmitButton, TextArea, TextField } from "@/components/modal";

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

function Line({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular font-semibold ${
          tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CashPage() {
  const { data: movements = [], isLoading, error } = useCashTransactions();
  const { data: closures = [] } = useCashClosures();
  const { data: profile } = useProfile();
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const closeCash = useRpc<Record<string, unknown>>("close_cash");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState("");

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const today = resolvePeriod("today");
  const todayMovements = movements.filter((m: { occurred_at: string }) =>
    inRange(m.occurred_at, today.from, today.to),
  );
  const todaySales = (sales as Record<string, unknown>[]).filter((s) =>
    inRange(String(s["sale_date"]), today.from, today.to),
  );
  const todayPayments = (payments as Record<string, unknown>[]).filter((p) =>
    inRange(String(p["paid_at"]), today.from, today.to),
  );
  const todayExpenses = (expenses as Record<string, unknown>[]).filter((e) =>
    inRange(String(e["expense_date"]), today.from, today.to),
  );

  const balance = cashBalance(movements as never, num(profile?.opening_cash));
  const inflow = cashInflow(todayMovements as never);
  const outflow = cashOutflow(todayMovements as never);
  const opening = round2(balance - inflow + outflow);
  const paymentsIn = round2(
    todayPayments.filter((p) => p["direction"] === "in").reduce((s, p) => s + num(p["amount"]), 0),
  );
  const paymentsOut = round2(
    todayPayments.filter((p) => p["direction"] === "out").reduce((s, p) => s + num(p["amount"]), 0),
  );
  const variance = counted.trim() === "" ? 0 : round2(Number(counted) - balance);

  const todayClosure = closures.find(
    (c: { closure_date: string }) => c.closure_date === dayKey(new Date()),
  ) as Record<string, unknown> | undefined;

  async function submitClosure(e: React.FormEvent) {
    e.preventDefault();
    try {
      await closeCash.mutateAsync({
        p_date: dayKey(new Date()),
        p_note: note || null,
        p_counted: counted.trim() === "" ? null : Number(counted),
      });
      toast.success("Journée clôturée et conservée");
      setOpen(false);
      setNote("");
      setCounted("");
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
        <StatCard label="Entrées aujourd'hui" value={formatMoney(inflow)} tone="positive" />
        <StatCard label="Sorties aujourd'hui" value={formatMoney(outflow)} tone="negative" />
      </div>

      <section className="mt-6">
        <h2 className="flex items-center justify-between px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bilan du jour
          {todayClosure ? <StatusPill label="Clôturée" tone="success" /> : null}
        </h2>
        <div className="card-surface mx-4 divide-y divide-border">
          <Line label="Solde d'ouverture" value={formatMoney(opening)} />
          <Line label={`Ventes (${todaySales.length})`} value={formatMoney(revenue(todaySales as never))} />
          <Line label="Paiements reçus" value={formatMoney(paymentsIn)} tone="positive" />
          <Line label="Paiements effectués" value={formatMoney(paymentsOut)} tone="negative" />
          <Line
            label={`Dépenses (${todayExpenses.length})`}
            value={formatMoney(totalExpenses(todayExpenses as never))}
            tone="negative"
          />
          <Line label="Total entrées de caisse" value={formatMoney(inflow)} tone="positive" />
          <Line label="Total sorties de caisse" value={formatMoney(outflow)} tone="negative" />
          <div className="flex items-center justify-between bg-accent/60 px-4 py-3 text-sm font-semibold">
            <span>Solde attendu en caisse</span>
            <span className="tabular">{formatMoney(balance)}</span>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4">
        <button
          onClick={() => {
            setCounted(todayClosure ? String(num(todayClosure["counted"]) || "") : "");
            setNote(todayClosure ? String(todayClosure["note"] ?? "") : "");
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {todayClosure ? <RefreshCcw className="size-4" /> : <Lock className="size-4" />}
          {todayClosure ? "Mettre à jour la clôture du jour" : "Valider et clôturer la journée"}
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
            Journées clôturées
          </h2>
          <div className="space-y-3 px-4">
            {closures.map((c: Record<string, unknown>) => {
              const v = num(c["variance"]);
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
                  <div className="mt-2 flex items-center gap-2">
                    {c["counted"] === null || c["counted"] === undefined ? (
                      <StatusPill label="Sans comptage" tone="muted" />
                    ) : v === 0 ? (
                      <StatusPill label="Aucun écart" tone="success" />
                    ) : (
                      <StatusPill
                        label={`Écart ${v > 0 ? "+" : "−"} ${formatMoney(Math.abs(v))}`}
                        tone={v > 0 ? "warning" : "destructive"}
                      />
                    )}
                    {c["counted"] !== null && c["counted"] !== undefined ? (
                      <span className="text-xs text-muted-foreground">
                        Compté : {formatMoney(c["counted"])}
                      </span>
                    ) : null}
                  </div>
                  {c["note"] ? <p className="mt-2 text-xs text-muted-foreground">{String(c["note"])}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Clôture de la journée">
        <form onSubmit={submitClosure} className="space-y-4">
          <div className="card-surface divide-y divide-border">
            <Line label="Ventes du jour" value={formatMoney(revenue(todaySales as never))} />
            <Line label="Paiements reçus" value={formatMoney(paymentsIn)} />
            <Line label="Dépenses" value={formatMoney(totalExpenses(todayExpenses as never))} />
            <Line label="Solde attendu" value={formatMoney(balance)} />
          </div>
          <TextField
            label="Argent réellement compté en caisse (facultatif)"
            value={counted}
            onChange={setCounted}
            type="number"
            step="0.01"
            inputMode="decimal"
            hint="Laissez vide si vous ne comptez pas la caisse aujourd'hui."
          />
          {counted.trim() !== "" ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                variance === 0
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {variance === 0
                ? "Aucun écart : la caisse est juste."
                : `Écart de ${formatMoney(Math.abs(variance))} ${variance > 0 ? "en plus" : "en moins"}.`}
            </div>
          ) : null}
          <TextArea label="Note (facultatif)" value={note} onChange={setNote} />
          <SubmitButton loading={closeCash.isPending}>Valider et conserver le bilan</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
