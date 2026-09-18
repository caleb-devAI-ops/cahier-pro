import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  useCashTransactions,
  useExpenses,
  usePayments,
  useProducts,
  usePurchases,
  useSaleItems,
  useSales,
} from "@/lib/db";
import {
  cashInflow,
  cashOutflow,
  cogs,
  grossProfit,
  inRange,
  netProfit,
  payables,
  receivables,
  revenue,
  totalExpenses,
} from "@/lib/finance";
import { formatMoney, formatQty, num } from "@/lib/format";
import { PERIOD_OPTIONS, resolvePeriod, type PeriodKey } from "@/lib/periods";
import { downloadCsv, downloadXlsx } from "@/lib/export";
import { ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — Cahier Pro" },
      { name: "description", content: "Chiffre d'affaires, bénéfices, dépenses et produits rentables." },
      { property: "og:title", content: "Rapports — Cahier Pro" },
      { property: "og:description", content: "Analysez vos résultats par période et exportez-les." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: sales = [], isLoading, error } = useSales();
  const { data: expenses = [] } = useExpenses();
  const { data: purchases = [] } = usePurchases();
  const { data: payments = [] } = usePayments();
  const { data: cash = [] } = useCashTransactions();
  const { data: saleItems = [] } = useSaleItems();
  const { data: products = [] } = useProducts();

  const range = useMemo(() => resolvePeriod(period, { from, to }), [period, from, to]);

  const pSales = sales.filter((s: { sale_date: string }) => inRange(s.sale_date, range.from, range.to));
  const pExpenses = expenses.filter((e: { expense_date: string }) =>
    inRange(e.expense_date, range.from, range.to),
  );
  const pPurchases = purchases.filter((p: { purchase_date: string }) =>
    inRange(p.purchase_date, range.from, range.to),
  );
  const pPayments = payments.filter((p: { paid_at: string }) => inRange(p.paid_at, range.from, range.to));
  const pCash = cash.filter((c: { occurred_at: string }) => inRange(c.occurred_at, range.from, range.to));

  const productProfit = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    for (const it of saleItems as Array<Record<string, unknown>>) {
      const sale = it["sales"] as { status?: string; sale_date?: string } | null;
      if (!sale || sale.status === "cancelled") continue;
      if (sale.sale_date && !inRange(sale.sale_date, range.from, range.to)) continue;
      const id = String(it["product_id"] ?? it["product_name"] ?? "-");
      const qty = num(it["quantity"]) - num(it["returned_quantity"]);
      if (qty <= 0) continue;
      const entry = map.get(id) ?? {
        name: String(it["product_name"] ?? "Produit"),
        qty: 0,
        revenue: 0,
        cost: 0,
      };
      entry.qty += qty;
      entry.revenue += qty * num(it["unit_price"]);
      entry.cost += qty * num(it["unit_cost"]);
      map.set(id, entry);
    }
    return [...map.values()]
      .map((e) => ({ ...e, profit: e.revenue - e.cost }))
      .sort((a, b) => b.profit - a.profit);
  }, [saleItems, range]);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const ca = revenue(pSales as never);
  const cmv = cogs(pSales as never);
  const brut = grossProfit(pSales as never);
  const dep = totalExpenses(pExpenses as never);
  const net = netProfit(pSales as never, pExpenses as never);

  function reportRows(): (string | number)[][] {
    return [
      ["Rapport", range.label],
      [],
      ["Indicateur", "Montant (HTG)"],
      ["Chiffre d'affaires", ca],
      ["Coût des marchandises vendues", cmv],
      ["Marge brute", brut],
      ["Dépenses", dep],
      ["Bénéfice net", net],
      ["Créances clients", receivables(sales as never)],
      ["Dettes fournisseurs", payables(purchases as never)],
      ["Entrées de caisse", cashInflow(pCash as never)],
      ["Sorties de caisse", cashOutflow(pCash as never)],
      [],
      ["Produit", "Quantité vendue", "Ventes", "Coût", "Bénéfice"],
      ...productProfit.map((p) => [p.name, p.qty, p.revenue, p.cost, p.profit]),
    ];
  }

  const baseName = `rapport-${range.label.toLowerCase().replace(/\s+/g, "-")}`;

  function exportCsv() {
    downloadCsv(`${baseName}.csv`, reportRows());
  }

  async function exportXlsx() {
    await downloadXlsx(`${baseName}.xlsx`, reportRows(), "Rapport");
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Rapports"
        subtitle={range.label}
        action={
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 rounded-full bg-secondary px-3.5 py-2.5 text-sm font-semibold"
            >
              <Download className="size-4" /> CSV
            </button>
            <button
              onClick={exportXlsx}
              className="flex items-center gap-1 rounded-full bg-secondary px-3.5 py-2.5 text-sm font-semibold"
            >
              <FileSpreadsheet className="size-4" /> Excel
            </button>
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setPeriod(o.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              period === o.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-2xl border border-input bg-card px-4 py-3 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-2xl border border-input bg-card px-4 py-3 text-sm"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard label="Chiffre d'affaires" value={formatMoney(ca)} tone="primary" />
        <StatCard label="Coût marchandises" value={formatMoney(cmv)} />
        <StatCard label="Marge brute" value={formatMoney(brut)} tone="positive" />
        <StatCard label="Dépenses" value={formatMoney(dep)} tone="negative" />
        <StatCard
          label="Bénéfice net"
          value={formatMoney(net)}
          tone={net >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Créances clients" value={formatMoney(receivables(sales as never))} />
        <StatCard label="Dettes fournisseurs" value={formatMoney(payables(purchases as never))} />
        <StatCard label="Achats" value={formatMoney(pPurchases.reduce((s, p: { total: unknown }) => s + num(p.total), 0))} />
        <StatCard label="Entrées de caisse" value={formatMoney(cashInflow(pCash as never))} tone="positive" />
        <StatCard label="Sorties de caisse" value={formatMoney(cashOutflow(pCash as never))} tone="negative" />
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 pt-3">
        <StatCard label="Ventes" value={String(pSales.length)} />
        <StatCard label="Paiements" value={String(pPayments.length)} />
        <StatCard label="Produits" value={String(products.length)} />
      </div>

      <section className="mt-6">
        <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Produits les plus rentables
        </h2>
        {productProfit.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">Aucune vente sur cette période.</p>
        ) : (
          <div className="card-surface mx-4 divide-y divide-border">
            {productProfit.slice(0, 20).map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(p.qty)} vendu(s) · Coût total {formatMoney(p.cost)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold text-success">{formatMoney(p.profit)}</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
