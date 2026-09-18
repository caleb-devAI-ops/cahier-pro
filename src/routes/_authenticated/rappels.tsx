import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BellRing, MessageCircle } from "lucide-react";
import { useCustomers, usePurchases, useSales, useSuppliers } from "@/lib/db";
import { formatDate, formatMoney, num } from "@/lib/format";
import { saleDue } from "@/lib/finance";
import { whatsappNumber } from "@/lib/receipt-pdf";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rappels")({
  head: () => ({
    meta: [
      { title: "Rappels de dettes — Cahier Pro" },
      {
        name: "description",
        content: "Clients qui n'ont pas payé et fournisseurs à régler, avec rappel WhatsApp en un geste.",
      },
      { property: "og:title", content: "Rappels de dettes — Cahier Pro" },
      { property: "og:description", content: "Relancez vos clients et suivez vos dettes." },
    ],
  }),
  component: RemindersPage,
});

const DELAYS = [0, 3, 7, 15, 30];

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function RemindersPage() {
  const [delay, setDelay] = useState(7);
  const { data: sales = [], isLoading, error } = useSales();
  const { data: customers = [] } = useCustomers();
  const { data: purchases = [] } = usePurchases();
  const { data: suppliers = [] } = useSuppliers();

  const clientDebts = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; due: number; oldest: string }>();
    for (const s of sales as Array<Record<string, any>>) {
      if (s["status"] === "cancelled") continue;
      const due = saleDue(s as never);
      if (due <= 0.009) continue;
      const cid = String(s["customer_id"] ?? "anon");
      const customer = (customers as Array<Record<string, any>>).find((c) => c["id"] === cid);
      const entry = map.get(cid) ?? {
        name: (s["customers"]?.name as string) ?? "Client de passage",
        phone: (customer?.["whatsapp"] as string) || (customer?.["phone"] as string) || undefined,
        due: 0,
        oldest: String(s["sale_date"]),
      };
      entry.due += due;
      if (new Date(s["sale_date"]) < new Date(entry.oldest)) entry.oldest = String(s["sale_date"]);
      map.set(cid, entry);
    }
    return [...map.values()]
      .filter((e) => daysSince(e.oldest) >= delay)
      .sort((a, b) => b.due - a.due);
  }, [sales, customers, delay]);

  const supplierDebts = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; due: number; oldest: string }>();
    for (const p of purchases as Array<Record<string, any>>) {
      const due = num(p["total"]) - num(p["paid"]);
      if (due <= 0.009) continue;
      const sid = String(p["supplier_id"] ?? "anon");
      const supplier = (suppliers as Array<Record<string, any>>).find((s) => s["id"] === sid);
      const entry = map.get(sid) ?? {
        name: (p["suppliers"]?.name as string) ?? "Fournisseur",
        phone: (supplier?.["whatsapp"] as string) || (supplier?.["phone"] as string) || undefined,
        due: 0,
        oldest: String(p["purchase_date"]),
      };
      entry.due += due;
      if (new Date(p["purchase_date"]) < new Date(entry.oldest)) entry.oldest = String(p["purchase_date"]);
      map.set(sid, entry);
    }
    return [...map.values()]
      .filter((e) => daysSince(e.oldest) >= delay)
      .sort((a, b) => b.due - a.due);
  }, [purchases, suppliers, delay]);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  const totalIn = clientDebts.reduce((s, c) => s + c.due, 0);
  const totalOut = supplierDebts.reduce((s, c) => s + c.due, 0);

  return (
    <div className="pb-6">
      <PageHeader title="Rappels" subtitle="Dettes en attente depuis un certain temps" />

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {DELAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDelay(d)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium",
              delay === d ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            {d === 0 ? "Toutes" : `+ de ${d} jours`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard label="À recevoir" value={formatMoney(totalIn)} tone="primary" />
        <StatCard label="À payer" value={formatMoney(totalOut)} tone="negative" />
      </div>

      <Section
        title="Clients à relancer"
        rows={clientDebts}
        message={(r) =>
          `Bonjour ${r.name}, un solde de ${formatMoney(r.due)} reste dû depuis le ${formatDate(r.oldest)}. Merci de régulariser dès que possible. — LIKID LAKAY`
        }
        empty="Aucun client en retard de paiement."
      />
      <Section
        title="Fournisseurs à payer"
        rows={supplierDebts}
        message={(r) =>
          `Bonjour, concernant notre solde de ${formatMoney(r.due)} depuis le ${formatDate(r.oldest)} — LIKID LAKAY`
        }
        empty="Aucune dette fournisseur en retard."
      />
    </div>
  );
}

interface Row {
  name: string;
  phone?: string | undefined;
  due: number;
  oldest: string;
}

function Section({
  title,
  rows,
  message,
  empty,
}: {
  title: string;
  rows: Row[];
  message: (r: Row) => string;
  empty: string;
}) {
  return (
    <section className="mt-5">
      <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {rows.length === 0 ? (
        <EmptyState title={empty} icon={<BellRing className="size-6" />} />
      ) : (
        <div className="space-y-3 px-4">
          {rows.map((r) => (
            <div key={`${title}-${r.name}-${r.oldest}`} className="card-surface flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  Depuis le {formatDate(r.oldest)} · {daysSince(r.oldest)} jour(s)
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular text-destructive">
                {formatMoney(r.due)}
              </span>
              <a
                href={`https://wa.me/${whatsappNumber(r.phone) ?? ""}?text=${encodeURIComponent(message(r))}`}
                target="_blank"
                rel="noreferrer"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success"
                aria-label={`Relancer ${r.name} sur WhatsApp`}
              >
                <MessageCircle className="size-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
