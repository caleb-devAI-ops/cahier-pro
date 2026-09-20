/** Sauvegarde complète et restauration contrôlée des données de l'utilisateur. */
import { supabase } from "@/integrations/supabase/client";

export const BACKUP_TABLES = [
  "customers",
  "suppliers",
  "products",
  "sales",
  "sale_items",
  "purchases",
  "purchase_items",
  "payments",
  "expenses",
  "cash_transactions",
  "cash_closures",
  "stock_movements",
  "returns",
  "return_items",
  "activity_log",
  "doc_counters",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  app: "cahier-pro";
  version: 1;
  created_at: string;
  profile?: Record<string, unknown> | null;
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

/** Lit toutes les tables de l'utilisateur et construit le fichier de sauvegarde. */
export async function buildBackup(): Promise<BackupFile> {
  const data: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase.from as any)(table).select("*").limit(20000);
    if (error) throw new Error(`${table} : ${error.message}`);
    data[table] = (rows ?? []) as Record<string, unknown>[];
    counts[table] = data[table]!.length;
  }

  const { data: auth } = await supabase.auth.getUser();
  let profile: Record<string, unknown> | null = null;
  if (auth.user) {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
    profile = (p as Record<string, unknown> | null) ?? null;
  }

  return {
    app: "cahier-pro",
    version: 1,
    created_at: new Date().toISOString(),
    profile,
    counts,
    data,
  };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `cahier-pro-sauvegarde-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFileName(new Date(backup.created_at));
  a.click();
  URL.revokeObjectURL(url);
}

/** Vérifie qu'un fichier lu est bien une sauvegarde Cahier Pro. */
export function parseBackup(raw: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Fichier illisible : ce n'est pas une sauvegarde valide.");
  }
  const file = parsed as Partial<BackupFile>;
  if (!file || file.app !== "cahier-pro" || typeof file.data !== "object" || !file.data) {
    throw new Error("Ce fichier n'est pas une sauvegarde Cahier Pro.");
  }
  return file as BackupFile;
}

export function backupTotal(file: BackupFile): number {
  return Object.values(file.data).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}

/** Remplace toutes les données par celles de la sauvegarde (transaction côté base). */
export async function restoreBackup(file: BackupFile): Promise<Record<string, number>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("restore_backup", { p_data: file.data });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, number>;
}
