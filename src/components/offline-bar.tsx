import { useEffect } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { flushQueue, useOfflineState } from "@/lib/offline";

/** Bandeau d'état réseau + synchronisation automatique des opérations en attente. */
export function OfflineBar() {
  const { online, pending } = useOfflineState();
  const qc = useQueryClient();

  useEffect(() => {
    if (!online || pending === 0) return;
    let cancelled = false;
    (async () => {
      const { synced, failed } = await flushQueue();
      if (cancelled) return;
      if (synced > 0) {
        toast.success(`${synced} opération(s) synchronisée(s)`);
        qc.invalidateQueries();
      }
      if (failed > 0) toast.error(`${failed} opération(s) n'ont pas pu être synchronisées`);
    })();
    return () => {
      cancelled = true;
    };
  }, [online, pending, qc]);

  if (online && pending === 0) return null;

  return (
    <div
      className={`sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold ${
        online ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive"
      }`}
    >
      {online ? <RefreshCw className="size-3.5 animate-spin" /> : <CloudOff className="size-3.5" />}
      {online
        ? `Synchronisation de ${pending} opération(s)…`
        : `Hors ligne — ${pending} opération(s) en attente d'envoi`}
    </div>
  );
}
