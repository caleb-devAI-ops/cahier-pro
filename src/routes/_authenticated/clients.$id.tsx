import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { useCustomers, usePayments, useSales } from "@/lib/db";
import { receivables, saleDue, saleStatusLabel } from "@/lib/finance";
import { formatDate, formatMoney, num } from "@/lib/format";
import { CustomerDialog, PaymentDialog } from "@/components/forms";
import { ErrorState, LoadingList, StatCard, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client — Cahier Pro" },
      { name: "description", content: "Achats, paiements, dettes et historique d'un client." },
      { property: "og:title", content: "Fiche client — Cahier Pro" },
      { property: "og:description", content: "Achats, paiements et dettes d'un client." },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = usePayments();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading) return <LoadingList />;
  const customer = customers.find((c) => c.id === id);
  if (!customer) return <ErrorState message="Client introuvable" />;

  const cs = sales.filter((s) => s.customer_id === id);
  const cp = payments.filter((p) => p.customer_id === id);
  const totalAchats = cs.reduce((s, x) => s + num(x.total), 0);
  const totalPaye = cs.reduce((s, x) => s + num(x.paid), 0);
  const due = receivables(cs);
  const oldestDue = cs.filter((s) => saleDue(s) > 0).sort(
    (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime(),
  )[0];

  return (
    <div className="space-y-5 px-4 pt-6">
      <Link to="/clients" className="text-sm font-semibold text-primary">
        ← Clients
      </Link>

      <div className="card-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold">{customer.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{customer.phone || "Sans téléphone"}</p>
            {customer.address ? (
              <p className="text-sm text-muted-foreground">{customer.address}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Client depuis le {formatDate(customer.created_at)}</p>
          </div>
          <button onClick={() => setEditOpen(true)} className="rounded-full bg-muted p-2.5" aria-label="Modifier">
            <Pencil className="size-4" />
          </button>
        </div>
        {customer.note ? (
          <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm">{customer.note}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total des achats" value={formatMoney(totalAchats)} />
        <StatCard label="Total payé" value={formatMoney(totalPaye)} tone="positive" />
        <StatCard label="Reste à payer" value={formatMoney(due)} tone={due > 0 ? "negative" : "default"} />
        <StatCard
          label="Transactions"
          value={String(cs.length)}
          hint={cs[0] ? `Dernière : ${formatDate(cs[0].sale_date)}` : ""}
        />
      </div>

      {due > 0 ? (
        <button
          onClick={() => setPayOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          <Wallet className="size-4" /> Ajouter un paiement
        </button>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ventes
        </h2>
        {cs.length === 0 ? (
          <p className="card-surface p-4 text-sm text-muted-foreground">Aucune vente pour ce client.</p>
        ) : (
          <div className="space-y-2">
            {cs.map((s) => {
              const st = saleStatusLabel(s);
              return (
                <Link
                  key={s.id}
                  to="/ventes/$id"
                  params={{ id: s.id }}
                  className="card-surface flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.sale_date)}</p>
                    <div className="mt-1">
                      <StatusPill label={st.label} tone={st.tone} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{formatMoney(s.total)}</p>
                    {saleDue(s) > 0 ? (
                      <p className="text-xs text-destructive tabular">Reste {formatMoney(saleDue(s))}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="pb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Paiements
        </h2>
        {cp.length === 0 ? (
          <p className="card-surface p-4 text-sm text-muted-foreground">Aucun paiement enregistré.</p>
        ) : (
          <div className="card-surface divide-y divide-border">
            {cp.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{p.number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.paid_at)}</p>
                </div>
                <span className={`tabular font-semibold ${p.direction === "in" ? "text-success" : "text-destructive"}`}>
                  {formatMoney(p.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <CustomerDialog open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        direction="in"
        customerId={id}
        saleId={oldestDue?.id ?? null}
        remaining={oldestDue ? saleDue(oldestDue) : due}
        title="Ajouter un paiement"
      />
    </div>
  );
}
