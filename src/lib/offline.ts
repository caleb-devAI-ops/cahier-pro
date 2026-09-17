/**
 * Mode hors ligne : les ventes, achats et paiements créés sans connexion sont
 * stockés localement puis rejoués automatiquement au retour du réseau.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QueueableFn =
  | "create_sale"
  | "create_purchase"
  | "record_payment"
  | "create_expense";

export interface QueuedOperation {
  id: string;
  fn: QueueableFn;
  args: Record<string, unknown>;
  label: string;
  created_at: string;
}

const KEY = "cp-offline-queue";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function isQueueable(fn: string): fn is QueueableFn {
  return ["create_sale", "create_purchase", "record_payment", "create_expense"].includes(fn);
}

export function readQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedOperation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  notify();
}

export function enqueue(fn: QueueableFn, args: Record<string, unknown>, label: string) {
  const op: QueuedOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fn,
    args,
    label,
    created_at: new Date().toISOString(),
  };
  writeQueue([...readQueue(), op]);
  return op;
}

export function clearQueue() {
  writeQueue([]);
}

let syncing = false;

/** Rejoue les opérations en attente. Renvoie le nombre d'opérations synchronisées. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = readQueue();
    const remaining: QueuedOperation[] = [];
    for (const op of pending) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)(op.fn, op.args);
      if (error) {
        failed += 1;
        remaining.push(op);
      } else {
        synced += 1;
      }
    }
    writeQueue(remaining);
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** État réseau + file d'attente, pour l'interface. */
export function useOfflineState() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(readQueue().length);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    const refresh = () => setPending(readQueue().length);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const unsub = subscribeQueue(refresh);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      unsub();
    };
  }, []);

  return { online, pending };
}
