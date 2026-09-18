import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, MessageCircle, Printer, Search, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useSaleReceipts } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  downloadReceiptPdf,
  printReceiptPdf,
  receiptFromSale,
  receiptStatus,
  shareReceiptPdf,
  shareReceiptWhatsApp,
} from "@/lib/receipt-pdf";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/recus")({
  head: () => ({
    meta: [
      { title: "Reçus — Cahier Pro" },
      {
        name: "description",
        content: "Tous vos reçus archivés : recherche par numéro, client ou date, partage PDF et WhatsApp.",
      },
      { property: "og:title", content: "Reçus — Cahier Pro" },
      { property: "og:description", content: "Archive complète de vos reçus, prête à partager." },
    ],
  }),
  component: ReceiptsPage,
});

type Sale = Record<string, unknown> & {
  id: string;
  number: string;
  receipt_number?: string | null;
  sale_date: string;
  total: number | string;
  paid: number | string;
  customers?: { name?: string | null; phone?: string | null; whatsapp?: string | null } | null;
};

function ReceiptsPage() {
  const { data: sales = [], isLoading, error } = useSaleReceipts();
  const { data: profile } = useProfile();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (sales as Sale[]).filter((s) => {
      if (from && s.sale_date.slice(0, 10) < from) return false;
      if (to && s.sale_date.slice(0, 10) > to) return false;
      if (!needle) return true;
      return [s.receipt_number, s.number, s.customers?.name, s.sale_date.slice(0, 10)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [sales, q, from, to]);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="pb-6">
      <PageHeader title="Reçus" subtitle={`${list.length} reçu(s) archivé(s)`} />

      <div className="space-y-2 px-4 pb-4">
        <label className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Numéro, client ou date…"
            className="w-full bg-transparent text-base outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-2xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-2xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Aucun reçu trouvé"
          description="Modifiez votre recherche ou enregistrez une nouvelle vente."
        />
      ) : (
        <div className="space-y-3 px-4">
          {list.map((sale) => (
            <ReceiptCard key={sale.id} sale={sale} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptCard({ sale, profile }: { sale: Sale; profile: unknown }) {
  const data = receiptFromSale(sale as never, profile as never);
  const status = receiptStatus(data);
  const tone = status.key === "paid" ? "success" : status.key === "partial" ? "warning" : "destructive";

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/ventes/$id"
            params={{ id: sale.id }}
            className="truncate font-semibold text-primary"
          >
            {data.number}
          </Link>
          <p className="truncate text-sm">{data.customerName}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(sale.sale_date)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular">{formatMoney(data.total)}</p>
          <div className="mt-1">
            <StatusPill label={status.label} tone={tone} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Action
          icon={<Printer className="size-4" />}
          label="Imprimer"
          onClick={() => printReceiptPdf(data)}
        />
        <Action
          icon={<Download className="size-4" />}
          label="PDF"
          onClick={() => downloadReceiptPdf(data)}
        />
        <Action
          icon={<MessageCircle className="size-4" />}
          label="WhatsApp"
          onClick={async () => {
            const res = await shareReceiptWhatsApp(data, data.customerPhone);
            if (res === "whatsapp") toast.success("Reçu téléchargé — joignez-le dans WhatsApp");
          }}
        />
        <Action
          icon={<Share2 className="size-4" />}
          label="Partager"
          onClick={async () => {
            try {
              const res = await shareReceiptPdf(data);
              if (res === "downloaded") toast.success("Reçu PDF téléchargé");
            } catch {
              toast.error("Partage annulé");
            }
          }}
        />
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-2.5 text-[11px] font-medium"
    >
      {icon}
      {label}
    </button>
  );
}
