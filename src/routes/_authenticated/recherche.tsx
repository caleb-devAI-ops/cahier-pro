import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  useCustomers,
  useExpenses,
  useProducts,
  usePurchases,
  useSaleReceipts,
  useSuppliers,
} from "@/lib/db";
import { formatDate, formatMoney, num } from "@/lib/format";
import { EmptyState, ListRow, PageHeader, StatusPill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recherche")({
  head: () => ({
    meta: [
      { title: "Recherche — Cahier Pro" },
      {
        name: "description",
        content: "Retrouvez instantanément une vente, un reçu, un client, un produit ou une dépense.",
      },
      { property: "og:title", content: "Recherche — Cahier Pro" },
      { property: "og:description", content: "Recherche globale dans toute votre activité." },
    ],
  }),
  component: SearchPage,
});

type Kind = "all" | "sales" | "customers" | "products" | "suppliers" | "purchases" | "expenses";

const FILTERS: { key: Kind; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "sales", label: "Ventes" },
  { key: "customers", label: "Clients" },
  { key: "products", label: "Produits" },
  { key: "suppliers", label: "Fournisseurs" },
  { key: "purchases", label: "Achats" },
  { key: "expenses", label: "Dépenses" },
];

type Result = {
  id: string;
  kind: Exclude<Kind, "all">;
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  to?: string;
  params?: Record<string, string>;
};

const KIND_LABEL: Record<Exclude<Kind, "all">, string> = {
  sales: "Vente",
  customers: "Client",
  products: "Produit",
  suppliers: "Fournisseur",
  purchases: "Achat",
  expenses: "Dépense",
};

function SearchPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [sort, setSort] = useState<"recent" | "amount">("recent");

  const { data: sales = [] } = useSaleReceipts();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const { data: expenses = [] } = useExpenses();

  const results = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const match = (...values: unknown[]) =>
      values.filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    const out: Result[] = [];

    for (const s of sales as Array<Record<string, any>>) {
      const items = (s["sale_items"] ?? []) as Array<Record<string, unknown>>;
      if (
        match(s["number"], s["receipt_number"], s["customers"]?.name, ...items.map((i) => i["product_name"]))
      ) {
        out.push({
          id: String(s["id"]),
          kind: "sales",
          title: `${s["receipt_number"] ?? s["number"]}`,
          subtitle: `${s["customers"]?.name ?? "Client de passage"} · ${formatDate(s["sale_date"])}`,
          amount: num(s["total"]),
          date: String(s["sale_date"]),
          to: "/ventes/$id",
          params: { id: String(s["id"]) },
        });
      }
    }
    for (const c of customers as Array<Record<string, any>>) {
      if (match(c["name"], c["phone"], c["whatsapp"], c["code"]))
        out.push({
          id: String(c["id"]),
          kind: "customers",
          title: String(c["name"]),
          subtitle: String(c["phone"] ?? "Client"),
          date: String(c["created_at"]),
          to: "/clients/$id",
          params: { id: String(c["id"]) },
        });
    }
    for (const p of products as Array<Record<string, any>>) {
      if (match(p["name"], p["sku"], p["category"]))
        out.push({
          id: String(p["id"]),
          kind: "products",
          title: String(p["name"]),
          subtitle: `Stock ${num(p["stock"])} · ${String(p["category"] ?? "Sans catégorie")}`,
          amount: num(p["sale_price"]),
          date: String(p["created_at"]),
          to: "/produits",
        });
    }
    for (const s of suppliers as Array<Record<string, any>>) {
      if (match(s["name"], s["phone"], s["whatsapp"]))
        out.push({
          id: String(s["id"]),
          kind: "suppliers",
          title: String(s["name"]),
          subtitle: String(s["phone"] ?? "Fournisseur"),
          date: String(s["created_at"]),
          to: "/fournisseurs",
        });
    }
    for (const p of purchases as Array<Record<string, any>>) {
      if (match(p["number"], p["suppliers"]?.name))
        out.push({
          id: String(p["id"]),
          kind: "purchases",
          title: String(p["number"]),
          subtitle: `${p["suppliers"]?.name ?? "Fournisseur"} · ${formatDate(p["purchase_date"])}`,
          amount: num(p["total"]),
          date: String(p["purchase_date"]),
          to: "/achats",
        });
    }
    for (const e of expenses as Array<Record<string, any>>) {
      if (match(e["number"], e["description"], e["category"]))
        out.push({
          id: String(e["id"]),
          kind: "expenses",
          title: String(e["description"]),
          subtitle: `${String(e["category"])} · ${formatDate(e["expense_date"])}`,
          amount: num(e["amount"]),
          date: String(e["expense_date"]),
          to: "/depenses",
        });
    }
    return out;
  }, [q, sales, customers, products, suppliers, purchases, expenses]);

  const filtered = useMemo(() => {
    const list = kind === "all" ? results : results.filter((r) => r.kind === kind);
    return [...list].sort((a, b) =>
      sort === "amount"
        ? (b.amount ?? 0) - (a.amount ?? 0)
        : new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  }, [results, kind, sort]);

  return (
    <div className="pb-6">
      <PageHeader title="Recherche" subtitle="Ventes, reçus, clients, produits, achats, dépenses" />

      <div className="px-4">
        <label className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tapez un nom, un numéro, un produit…"
            className="w-full bg-transparent text-base outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setKind(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium",
              kind === f.key ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
        <span>{q.trim() ? `${filtered.length} résultat(s)` : "Commencez à taper"}</span>
        <button
          onClick={() => setSort(sort === "recent" ? "amount" : "recent")}
          className="font-semibold text-primary"
        >
          Trier : {sort === "recent" ? "plus récent" : "montant"}
        </button>
      </div>

      {q.trim() && filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre mot ou un autre filtre." />
      ) : (
        <div className="space-y-3 px-4">
          {filtered.map((r) => (
            <ListRow
              key={`${r.kind}-${r.id}`}
              title={r.title}
              subtitle={
                <span className="flex items-center gap-2">
                  <StatusPill label={KIND_LABEL[r.kind]} tone="primary" />
                  <span>{r.subtitle}</span>
                </span>
              }
              right={r.amount !== undefined ? formatMoney(r.amount) : ""}
              {...(r.to ? { to: r.to } : {})}
              {...(r.params ? { params: r.params } : {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}
