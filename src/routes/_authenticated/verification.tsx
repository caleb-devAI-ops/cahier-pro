import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QrCode, Search, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { useProfile, useSaleReceipts } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { receiptFromSale, receiptStatus, verifyUrl, type ReceiptData } from "@/lib/receipt-pdf";
import { EmptyState, ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Vérification des reçus — Cahier Pro" },
      {
        name: "description",
        content: "Ouvrez le QR de chaque reçu pour confirmer depuis le téléphone qu'un paiement est bien PAYÉ.",
      },
      { property: "og:title", content: "Vérification des reçus — Cahier Pro" },
      { property: "og:description", content: "Confirmez l'authenticité et le paiement d'un reçu en un scan." },
    ],
  }),
  component: VerificationPage,
});

function QrPanel({ receipt }: { receipt: ReceiptData }) {
  const [src, setSrc] = useState<string | null>(null);
  const url = verifyUrl(receipt);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <div className="mt-3 flex flex-col items-center gap-2 border-t border-dashed border-border pt-3">
      {src ? (
        <img src={src} alt={`QR de vérification du reçu ${receipt.number}`} className="size-40 rounded-xl" />
      ) : (
        <div className="size-40 animate-pulse rounded-xl bg-muted" />
      )}
      <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
      <Link
        to="/verifier/$number"
        params={{ number: receipt.number }}
        className="text-sm font-semibold text-primary"
      >
        Ouvrir la page de vérification
      </Link>
    </div>
  );
}

function VerificationPage() {
  const { data: sales = [], isLoading, error } = useSaleReceipts();
  const { data: profile } = useProfile();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyPaid, setOnlyPaid] = useState(false);

  const receipts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (sales as Record<string, unknown>[])
      .map((s) => ({ id: String(s["id"]), receipt: receiptFromSale(s as never, profile as never) }))
      .filter(({ receipt }) => {
        if (onlyPaid && receiptStatus(receipt).key !== "paid") return false;
        if (!needle) return true;
        return [receipt.number, receipt.saleNumber, receipt.customerName, receipt.date.slice(0, 10)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle));
      });
  }, [sales, profile, q, onlyPaid]);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="pb-6">
      <PageHeader title="Vérification des reçus" subtitle={`${receipts.length} reçu(s)`} />

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
        <button
          onClick={() => setOnlyPaid((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${
            onlyPaid ? "bg-primary text-primary-foreground" : "bg-secondary"
          }`}
        >
          <ShieldCheck className="size-4" /> Seulement les reçus PAYÉ
        </button>
      </div>

      {receipts.length === 0 ? (
        <EmptyState title="Aucun reçu" description="Les reçus de vos ventes apparaîtront ici." />
      ) : (
        <div className="space-y-3 px-4">
          {receipts.map(({ id, receipt }) => {
            const status = receiptStatus(receipt);
            return (
              <div key={id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{receipt.number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {receipt.customerName} · {formatDateTime(receipt.date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular text-sm font-semibold">{formatMoney(receipt.total)}</span>
                    <StatusPill
                      label={status.label}
                      tone={
                        status.key === "paid" ? "success" : status.key === "partial" ? "warning" : "destructive"
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={() => setOpenId(openId === id ? null : id)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-xs font-semibold"
                >
                  <QrCode className="size-4" /> {openId === id ? "Masquer le QR" : "Afficher le QR"}
                </button>
                {openId === id ? <QrPanel receipt={receipt} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
