import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, MessageCircle, Printer, Share2, Undo2, Wallet } from "lucide-react";
import {
  downloadReceiptPdf,
  printReceiptPdf,
  receiptFromSale,
  shareReceiptPdf,
  shareReceiptWhatsApp,
} from "@/lib/receipt-pdf";
import { toast } from "sonner";
import { useProfile, useRpc, useSale } from "@/lib/db";
import { saleDue, saleStatusLabel } from "@/lib/finance";
import { formatDateTime, formatMoney, formatQty, num, paymentMethodLabel } from "@/lib/format";
import { ErrorState, LoadingList, StatusPill } from "@/components/ui-bits";
import { PaymentDialog } from "@/components/forms";
import { Modal, SubmitButton } from "@/components/modal";

export const Route = createFileRoute("/_authenticated/ventes/$id")({
  head: () => ({
    meta: [
      { title: "Reçu de vente — Cahier Pro" },
      { name: "description", content: "Détail et reçu d'une vente : produits, total, paiement et reste." },
      { property: "og:title", content: "Reçu de vente — Cahier Pro" },
      { property: "og:description", content: "Détail et reçu d'une vente." },
    ],
  }),
  component: SaleDetail,
});

function SaleDetail() {
  const { id } = Route.useParams();
  const { data: sale, isLoading, error } = useSale(id);
  const { data: profile } = useProfile();
  const [payOpen, setPayOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState("");
  const createReturn = useRpc<Record<string, unknown>>("create_sale_return");

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;
  if (!sale) return <ErrorState message="Vente introuvable" />;

  const items = (sale as { sale_items: Array<Record<string, unknown>> }).sale_items ?? [];
  const customer = (sale as { customers?: { name?: string; phone?: string } | null }).customers;
  const due = saleDue(sale as never);
  const receipt = receiptFromSale(sale as never, profile as never);
  const status = saleStatusLabel(sale as never);

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    const payload = Object.entries(quantities)
      .filter(([, v]) => num(v) > 0)
      .map(([sale_item_id, v]) => ({ sale_item_id, quantity: num(v) }));
    if (payload.length === 0) { toast.error("Indiquez au moins une quantité à retourner"); return; }
    try {
      await createReturn.mutateAsync({
        p_sale_id: id,
        p_items: payload,
        p_refund: num(refund),
        p_restock: true,
        p_reason: null,
      });
      toast.success("Retour enregistré — la vente d'origine est conservée");
      setReturnOpen(false);
      setQuantities({});
      setRefund("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/ventes" className="text-sm font-semibold text-primary">
          ← Ventes
        </Link>
        <StatusPill label={status.label} tone={status.tone} />
      </div>

      <div className="card-surface p-5 print:shadow-none" id="recu">
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold">
            {profile?.business_name || "Mon commerce"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Reçu {receipt.number}</p>
          <p className="text-xs text-muted-foreground">Vente {sale.number}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(sale.sale_date)}</p>
        </div>

        <div className="mt-4 border-t border-dashed border-border pt-3 text-sm">
          <p>
            <span className="text-muted-foreground">Client : </span>
            {customer?.name ?? "Client de passage"}
          </p>
          {customer?.phone ? (
            <p className="text-xs text-muted-foreground">{customer.phone}</p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2 border-t border-dashed border-border pt-3">
          {items.map((it) => (
            <div key={String(it["id"])} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p>{String(it["product_name"])}</p>
                <p className="text-xs text-muted-foreground">
                  {formatQty(it["quantity"])} × {formatMoney(it["unit_price"])}
                  {num(it["returned_quantity"]) > 0
                    ? ` · ${formatQty(it["returned_quantity"])} retourné(s)`
                    : ""}
                </p>
              </div>
              <span className="tabular">{formatMoney(it["line_total"])}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
          <Row label="Sous-total" value={formatMoney(sale.subtotal)} />
          <Row label="Remise" value={`− ${formatMoney(sale.discount)}`} />
          {num(sale.fee) > 0 ? <Row label="Frais / livraison" value={formatMoney(sale.fee)} /> : null}
          <Row label="Total" value={formatMoney(sale.total)} strong />
          <Row label="Payé" value={formatMoney(sale.paid)} />
          {num(sale.refunded) > 0 ? <Row label="Remboursé" value={formatMoney(sale.refunded)} /> : null}
          <Row label="Reste" value={formatMoney(due)} strong />
          <Row label="Mode de paiement" value={paymentMethodLabel(sale.payment_method)} />
        </div>
      </div>

      <button
        onClick={async () => {
          const res = await shareReceiptWhatsApp(receipt, receipt.customerPhone);
          if (res === "whatsapp") toast.success("Reçu téléchargé — joignez-le dans WhatsApp");
        }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-success py-3.5 text-sm font-semibold text-success-foreground print:hidden"
      >
        <MessageCircle className="size-4" /> Envoyer le reçu par WhatsApp
      </button>

      <div className="grid grid-cols-4 gap-2 print:hidden">
        <button
          onClick={() => printReceiptPdf(receipt)}
          className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-3 text-xs font-medium"
        >
          <Printer className="size-4" /> Imprimer
        </button>
        <button
          onClick={() => downloadReceiptPdf(receipt)}
          className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-3 text-xs font-medium"
        >
          <Download className="size-4" /> PDF
        </button>
        <button
          onClick={async () => {
            try {
              const res = await shareReceiptPdf(receipt);
              if (res === "downloaded") toast.success("Reçu PDF téléchargé");
            } catch {
              toast.error("Partage annulé");
            }
          }}
          className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-3 text-xs font-medium"
        >
          <Share2 className="size-4" /> Partager
        </button>
        <button
          onClick={() => setReturnOpen(true)}
          className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-3 text-xs font-medium"
        >
          <Undo2 className="size-4" /> Retour
        </button>
      </div>

      {due > 0 ? (
        <button
          onClick={() => setPayOpen(true)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground print:hidden"
        >
          <Wallet className="size-4" /> Encaisser un paiement
        </button>
      ) : null}

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        direction="in"
        saleId={id}
        customerId={sale.customer_id}
        remaining={due}
      />

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Retour de marchandise">
        <form onSubmit={submitReturn} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La vente d'origine est conservée dans l'historique. Les produits retournés sont remis en
            stock.
          </p>
          {items.map((it) => {
            const maxQty = num(it["quantity"]) - num(it["returned_quantity"]);
            return (
              <div key={String(it["id"])} className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p>{String(it["product_name"])}</p>
                  <p className="text-xs text-muted-foreground">Retournable : {formatQty(maxQty)}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={maxQty}
                  value={quantities[String(it["id"])] ?? ""}
                  onChange={(e) =>
                    setQuantities((q) => ({ ...q, [String(it["id"])]: e.target.value }))
                  }
                  className="w-20 rounded-2xl border border-input bg-background px-3 py-2 text-sm tabular outline-none"
                />
              </div>
            );
          })}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Remboursement en espèces (HTG)</span>
            <input
              type="number"
              step="0.01"
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none"
            />
          </label>
          <SubmitButton loading={createReturn.isPending}>Enregistrer le retour</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
