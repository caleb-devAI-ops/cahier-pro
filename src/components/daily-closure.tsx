/** Récapitulatif de clôture quotidienne : calculs partagés, résumé et validation. */
import { useState } from "react";
import { Lock, RefreshCcw } from "lucide-react";
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
import { formatMoney, num, round2 } from "@/lib/format";
import { dayKey, resolvePeriod } from "@/lib/periods";
import { Modal, SubmitButton, TextArea, TextField } from "@/components/modal";
import { StatusPill } from "@/components/ui-bits";

type Row = Record<string, unknown>;

export interface DailyClosure {
  dateKey: string;
  opening: number;
  salesTotal: number;
  salesCount: number;
  paymentsIn: number;
  paymentsOut: number;
  expensesTotal: number;
  expensesCount: number;
  inflow: number;
  outflow: number;
  expected: number;
  closure: Row | undefined;
  isClosed: boolean;
}

export function useDailyClosure(): DailyClosure {
  const { data: movements = [] } = useCashTransactions();
  const { data: closures = [] } = useCashClosures();
  const { data: profile } = useProfile();
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const today = resolvePeriod("today");
  const keep = (v: unknown) => inRange(String(v), today.from, today.to);

  const todayMovements = (movements as Row[]).filter((m) => keep(m["occurred_at"]));
  const todaySales = (sales as Row[]).filter((s) => keep(s["sale_date"]));
  const todayPayments = (payments as Row[]).filter((p) => keep(p["paid_at"]));
  const todayExpenses = (expenses as Row[]).filter((e) => keep(e["expense_date"]));

  const expected = cashBalance(movements as never, num(profile?.opening_cash));
  const inflow = cashInflow(todayMovements as never);
  const outflow = cashOutflow(todayMovements as never);
  const dateKey = dayKey(new Date());

  return {
    dateKey,
    opening: round2(expected - inflow + outflow),
    salesTotal: revenue(todaySales as never),
    salesCount: todaySales.length,
    paymentsIn: round2(
      todayPayments.filter((p) => p["direction"] === "in").reduce((s, p) => s + num(p["amount"]), 0),
    ),
    paymentsOut: round2(
      todayPayments.filter((p) => p["direction"] === "out").reduce((s, p) => s + num(p["amount"]), 0),
    ),
    expensesTotal: totalExpenses(todayExpenses as never),
    expensesCount: todayExpenses.length,
    inflow,
    outflow,
    expected,
    closure: (closures as Row[]).find((c) => String(c["closure_date"]) === dateKey),
    isClosed: (closures as Row[]).some((c) => String(c["closure_date"]) === dateKey),
  };
}

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

export function DailyClosureSummary({ day }: { day: DailyClosure }) {
  return (
    <div className="card-surface mx-4 divide-y divide-border">
      <Line label="Solde d'ouverture" value={formatMoney(day.opening)} />
      <Line label={`Ventes (${day.salesCount})`} value={formatMoney(day.salesTotal)} />
      <Line label="Paiements reçus" value={formatMoney(day.paymentsIn)} tone="positive" />
      <Line label="Paiements effectués" value={formatMoney(day.paymentsOut)} tone="negative" />
      <Line
        label={`Dépenses (${day.expensesCount})`}
        value={formatMoney(day.expensesTotal)}
        tone="negative"
      />
      <Line label="Total entrées de caisse" value={formatMoney(day.inflow)} tone="positive" />
      <Line label="Total sorties de caisse" value={formatMoney(day.outflow)} tone="negative" />
      <div className="flex items-center justify-between bg-accent/60 px-4 py-3 text-sm font-semibold">
        <span>Solde attendu en caisse</span>
        <span className="tabular">{formatMoney(day.expected)}</span>
      </div>
    </div>
  );
}

/** Bouton + fenêtre de validation de la journée (argent compté et écart). */
export function CloseDayButton({ day, compact }: { day: DailyClosure; compact?: boolean }) {
  const closeCash = useRpc<Record<string, unknown>>("close_cash");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState("");

  const variance = counted.trim() === "" ? 0 : round2(Number(counted) - day.expected);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await closeCash.mutateAsync({
        p_date: day.dateKey,
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
    <>
      <button
        onClick={() => {
          setCounted(day.closure ? String(num(day.closure["counted"]) || "") : "");
          setNote(day.closure ? String(day.closure["note"] ?? "") : "");
          setOpen(true);
        }}
        className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold ${
          compact ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"
        }`}
      >
        {day.isClosed ? <RefreshCcw className="size-4" /> : <Lock className="size-4" />}
        {day.isClosed ? "Mettre à jour la clôture du jour" : "Valider et clôturer la journée"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Clôture de la journée">
        <form onSubmit={submit} className="space-y-4">
          <div className="card-surface divide-y divide-border">
            <Line label="Solde attendu" value={formatMoney(day.expected)} />
            <Line label={`Ventes (${day.salesCount})`} value={formatMoney(day.salesTotal)} />
            <Line label="Dépenses" value={formatMoney(day.expensesTotal)} tone="negative" />
          </div>
          <TextField
            label="Argent réellement compté (HTG)"
            value={counted}
            onChange={setCounted}
            type="number"
            step="0.01"
            inputMode="decimal"
            hint="Laissez vide si vous ne comptez pas la caisse."
          />
          {counted.trim() !== "" ? (
            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3 text-sm">
              <span>Écart</span>
              <span className="flex items-center gap-2">
                <span className="tabular font-semibold">{formatMoney(variance)}</span>
                <StatusPill
                  label={variance === 0 ? "Aucun écart" : variance > 0 ? "Surplus" : "Manquant"}
                  tone={variance === 0 ? "success" : "warning"}
                />
              </span>
            </div>
          ) : null}
          <TextArea label="Note (optionnel)" value={note} onChange={setNote} />
          <SubmitButton loading={closeCash.isPending}>Valider le bilan du jour</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
