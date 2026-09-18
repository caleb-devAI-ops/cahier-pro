import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { formatDateTime, formatMoney, formatQty } from "@/lib/format";
import { receiptFromSale, receiptStatus } from "@/lib/receipt-pdf";
import { ErrorState, LoadingList, PageHeader, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/verifier/$number")({
  head: () => ({
    meta: [
      { title: "Vérification de reçu — Cahier Pro" },
      { name: "description", content: "Vérifiez l'authenticité d'un reçu à partir de son numéro." },
      { property: "og:title", content: "Vérification de reçu — Cahier Pro" },
      { property: "og:description", content: "Contrôle d'un reçu par numéro." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { number } = Route.useParams();
  const { data: profile } = useProfile();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verify", number],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name, phone, whatsapp), sale_items(*)")
        .or(`receipt_number.eq.${number},number.eq.${number}`)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) return <LoadingList rows={2} />;
  if (error) return <ErrorState message={error.message} />;

  if (!data) {
    return (
      <div className="px-4 pt-6">
        <PageHeader title="Vérification" subtitle={number} />
        <div className="card-surface flex flex-col items-center gap-2 p-8 text-center">
          <XCircle className="size-8 text-destructive" />
          <p className="font-semibold">Aucun reçu trouvé</p>
          <p className="text-sm text-muted-foreground">
            Ce numéro ne correspond à aucune vente enregistrée.
          </p>
        </div>
      </div>
    );
  }

  const receipt = receiptFromSale(data as never, profile as never);
  const status = receiptStatus(receipt);

  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="Reçu authentique" subtitle={receipt.number} />
      <div className="card-surface space-y-3 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-success" />
          <span className="font-semibold">Reçu vérifié</span>
          <span className="ml-auto">
            <StatusPill
              label={status.label}
              tone={status.key === "paid" ? "success" : status.key === "partial" ? "warning" : "destructive"}
            />
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{formatDateTime(receipt.date)}</p>
        <p className="text-sm">Client : {receipt.customerName}</p>
        <div className="space-y-1 border-t border-dashed border-border pt-3 text-sm">
          {receipt.items.map((it, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span>
                {it.product_name} · {formatQty(it.quantity)}
              </span>
              <span className="tabular">{formatMoney(it.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-dashed border-border pt-3 font-semibold">
          <span>Total</span>
          <span className="tabular">{formatMoney(receipt.total)}</span>
        </div>
      </div>
      <Link to="/recus" className="mt-4 block text-center text-sm font-semibold text-primary">
        Voir tous les reçus
      </Link>
    </div>
  );
}
