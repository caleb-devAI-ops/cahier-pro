import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import {
  useCashTransactions,
  useCustomers,
  useExpenses,
  usePayments,
  useProducts,
  useProfile,
  useSales,
} from "@/lib/db";
import {
  cashBalance,
  cogs,
  grossProfit,
  inRange,
  netProfit,
  receivables,
  revenue,
  totalExpenses,
} from "@/lib/finance";
import { formatDate, formatDayLabel, formatMoney, formatQty, num } from "@/lib/format";
import { PERIOD_OPTIONS, resolvePeriod, type PeriodKey } from "@/lib/periods";
import { ErrorState, LoadingList, Money, StatCard, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Cahier Pro" },
      { name: "description", content: "Vue immédiate de votre activité : ventes, bénéfices, dettes et caisse." },
      { property: "og:title", content: "Tableau de bord — Cahier Pro" },
      { property: "og:description", content: "Ventes, bénéfices, dettes et caisse en un coup d'œil." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const profile = useProfile();
  const sales = useSales();
  const expenses = useExpenses();
  const cash = useCashTransactions();
  const customers = useCustomers();
  const products = useProducts();
  const payments = usePayments();

  const range = useMemo(
    () => resolvePeriod(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );
  const today = useMemo(() => resolvePeriod("today"), []);

  const loading = sales.isLoading || expenses.isLoading || products.isLoading;
  const error = sales.error ?? expenses.error ?? products.error;

  const allSales = sales.data ?? [];
  const allExpenses = expenses.data ?? [];
  const allCash = cash.data ?? [];
  const allProducts = products.data ?? [];
  const allCustomers = customers.data ?? [];
  const allPayments = payments.data ?? [];

  const periodSales = allSales.filter((s) => inRange(s.sale_date, range.from, range.to));
  const periodExpenses = allExpenses.filter((e) => inRange(e.expense_date, range.from, range.to));
  const todaySales = allSales.filter((s) => inRange(s.sale_date, today.from, today.to));
  const todayExpenses = allExpenses.filter((e) => inRange(e.expense_date, today.from, today.to));
  const todayCashIn = allCash
    .filter((c) => c.type === "in" && inRange(c.occurred_at, today.from, today.to))
    .reduce((s, c) => s + num(c.amount), 0);

  const lowStock = allProducts.filter(
    (p) => p.track_stock && num(p.stock) <= num(p.min_stock) && !p.archived,
  );
  const debtors = allCustomers
    .map((c) => {
      const cs = allSales.filter((s) => s.customer_id === c.id && s.status !== "cancelled");
      return { customer: c, due: receivables(cs) };
    })
    .filter((d) => d.due > 0)
    .sort((a, b) => b.due - a.due);

  const chartData = useMemo(() => {
    const days: { key: string; label: string; ventes: number; benefice: number }[] = [];
    const cursor = new Date(range.from);
    const maxDays = 31;
    while (cursor <= range.to && days.length < maxDays) {
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const ds = allSales.filter((s) => inRange(s.sale_date, dayStart, dayEnd));
      const de = allExpenses.filter((e) => inRange(e.expense_date, dayStart, dayEnd));
      days.push({
        key: dayStart.toISOString(),
        label: formatDayLabel(dayStart),
        ventes: revenue(ds),
        benefice: netProfit(ds, de),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [allSales, allExpenses, range]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    periodExpenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + num(e.amount)));
    return Array.from(map.entries()).map(([label, montant]) => ({ label, montant }));
  }, [periodExpenses]);

  const recent = useMemo(() => {
    const items = [
      ...allSales.slice(0, 10).map((s) => ({
        id: `s-${s.id}`,
        date: s.sale_date,
        label: `Vente ${s.number}`,
        sub: (s as { customers?: { name?: string } | null }).customers?.name ?? "Client de passage",
        amount: num(s.total),
        sign: "+" as const,
      })),
      ...allExpenses.slice(0, 10).map((e) => ({
        id: `e-${e.id}`,
        date: e.expense_date,
        label: e.description,
        sub: "Dépense",
        amount: num(e.amount),
        sign: "-" as const,
      })),
      ...allPayments.slice(0, 10).map((p) => ({
        id: `p-${p.id}`,
        date: p.paid_at,
        label: `Paiement ${p.number}`,
        sub: p.direction === "in" ? "Encaissement" : "Décaissement",
        amount: num(p.amount),
        sign: p.direction === "in" ? ("+" as const) : ("-" as const),
      })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [allSales, allExpenses, allPayments]);

  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 px-4 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {profile.data?.business_name || "Votre commerce"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/recherche"
            aria-label="Recherche globale"
            className="flex size-10 items-center justify-center rounded-full bg-secondary"
          >
            <Search className="size-4" />
          </Link>
          <Link
            to="/rappels"
            aria-label="Rappels de dettes"
            className="flex size-10 items-center justify-center rounded-full bg-secondary"
          >
            <BellRing className="size-4" />
          </Link>
        </div>
      </header>

      {/* Sélecteur de période */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              period === p.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-2xl border border-input bg-card px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-2xl border border-input bg-card px-3 py-2.5 text-sm"
          />
        </div>
      ) : null}

      {loading ? (
        <LoadingList />
      ) : (
        <>
          <section className="px-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Aujourd'hui
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Ventes" value={formatMoney(revenue(todaySales))} tone="primary" />
              <StatCard label="Argent encaissé" value={formatMoney(todayCashIn)} tone="positive" />
              <StatCard label="Dépenses" value={formatMoney(totalExpenses(todayExpenses))} tone="negative" />
              <StatCard
                label="Bénéfice"
                value={formatMoney(netProfit(todaySales, todayExpenses))}
                tone={netProfit(todaySales, todayExpenses) >= 0 ? "positive" : "negative"}
              />
            </div>
          </section>

          <section className="px-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {range.label}
            </h2>
            <div className="card-surface divide-y divide-border">
              <Line label="Chiffre d'affaires" value={revenue(periodSales)} strong />
              <Line label="Coût des marchandises vendues" value={cogs(periodSales)} negative />
              <Line label="Marge brute" value={grossProfit(periodSales)} />
              <Line label="Dépenses" value={totalExpenses(periodExpenses)} negative />
              <Line label="Bénéfice net" value={netProfit(periodSales, periodExpenses)} strong />
              <Line label="Reste à recevoir" value={receivables(periodSales)} />
              <Line label="Solde de caisse" value={cashBalance(allCash, num(profile.data?.opening_cash))} />
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3 px-4">
            <StatCard label="Clients" value={String(allCustomers.length)} />
            <StatCard label="Produits" value={String(allProducts.length)} />
            <StatCard label="Ventes" value={String(allSales.length)} />
          </section>

          {chartData.length > 1 ? (
            <section className="px-4">
              <div className="card-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Ventes et bénéfice</h3>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip
                        formatter={(v: number) => formatMoney(v)}
                        contentStyle={{
                          borderRadius: 14,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="ventes"
                        name="Ventes"
                        stroke="var(--color-chart-1)"
                        fill="url(#gVentes)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="benefice"
                        name="Bénéfice"
                        stroke="var(--color-chart-2)"
                        fill="transparent"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          ) : null}

          {expensesByCategory.length > 0 ? (
            <section className="px-4">
              <div className="card-surface p-4">
                <h3 className="mb-3 text-sm font-semibold">Dépenses par catégorie</h3>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesByCategory}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip
                        formatter={(v: number) => formatMoney(v)}
                        contentStyle={{
                          borderRadius: 14,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="montant" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          ) : null}

          {(lowStock.length > 0 || debtors.length > 0) && (
            <section className="space-y-3 px-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Alertes
              </h2>
              {lowStock.length > 0 ? (
                <Link to="/produits" className="card-surface flex items-center gap-3 p-4">
                  <AlertTriangle className="size-5 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{lowStock.length} produit(s) presque épuisé(s)</p>
                    <p className="text-xs text-muted-foreground">
                      {lowStock
                        .slice(0, 3)
                        .map((p) => `${p.name} (${formatQty(p.stock)})`)
                        .join(", ")}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ) : null}
              {debtors.length > 0 ? (
                <Link to="/a-recevoir" className="card-surface flex items-center gap-3 p-4">
                  <AlertTriangle className="size-5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{debtors.length} client(s) avec une dette</p>
                    <p className="text-xs text-muted-foreground">
                      Total à recevoir : {formatMoney(debtors.reduce((s, d) => s + d.due, 0))}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ) : null}
            </section>
          )}

          <section className="px-4 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Transactions récentes
              </h2>
              <Link to="/historique" className="text-xs font-semibold text-primary">
                Tout voir
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="card-surface p-6 text-center text-sm text-muted-foreground">
                Aucune transaction pour le moment. Touchez le bouton + pour enregistrer votre première
                vente.
              </div>
            ) : (
              <div className="card-surface divide-y divide-border">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.sub} · {formatDate(r.date)}
                      </p>
                    </div>
                    <Money value={r.amount} tone={r.sign === "+" ? "positive" : "negative"} className="text-sm" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: number;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={`text-sm ${strong ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`tabular text-sm ${strong ? "font-semibold" : ""} ${negative ? "text-destructive" : ""}`}>
        {negative && value > 0 ? "−" : ""}
        {formatMoney(value)}
      </span>
    </div>
  );
}

export { StatusPill };
