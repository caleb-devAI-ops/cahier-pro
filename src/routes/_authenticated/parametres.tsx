import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, DatabaseBackup, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateAll, useProfile, useRpc } from "@/lib/db";
import {
  backupTotal,
  buildBackup,
  downloadBackup,
  parseBackup,
  restoreBackup,
  type BackupFile,
} from "@/lib/backup";
import { formatDateTime } from "@/lib/format";
import { Modal, SubmitButton, TextField } from "@/components/modal";
import { ErrorState, LoadingList, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Cahier Pro" },
      { name: "description", content: "Profil, entreprise, caisse initiale et réinitialisation de l'historique." },
      { property: "og:title", content: "Paramètres — Cahier Pro" },
      { property: "og:description", content: "Gérez votre profil et vos données." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile, isLoading, error } = useProfile();
  const invalidate = useInvalidateAll();
  const reset = useRpc<Record<string, unknown>>("reset_history");

  const [fullName, setFullName] = useState("");
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetStock, setResetStock] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [restoreText, setRestoreText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setBusiness(profile.business_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.business_address ?? "");
    setWhatsapp(profile.business_whatsapp ?? "");
    setOpening(String(profile.opening_cash ?? 0));
  }, [profile]);

  if (isLoading) return <LoadingList />;
  if (error) return <ErrorState message={error.message} />;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        business_name: business || null,
        phone: phone || null,
        business_address: address || null,
        business_whatsapp: whatsapp || null,
        opening_cash: Number(opening) || 0,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Profil enregistré");
    invalidate();
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== "REINITIALISER") {
      toast.error("Tapez REINITIALISER pour confirmer");
      return;
    }
    try {
      await reset.mutateAsync({ p_reset_stock: resetStock });
      toast.success("Historique réinitialisé");
      setConfirmOpen(false);
      setConfirmText("");
      setResetStock(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="pb-6">
      <PageHeader title="Paramètres" subtitle="Profil, entreprise et données" />

      <form onSubmit={saveProfile} className="card-surface mx-4 space-y-4 p-4">
        <TextField label="Nom complet" value={fullName} onChange={setFullName} />
        <TextField label="Nom de l'entreprise" value={business} onChange={setBusiness} />
        <TextField label="Téléphone" value={phone} onChange={setPhone} />
        <TextField label="Adresse / zone du business" value={address} onChange={setAddress} />
        <TextField label="WhatsApp du business (reçus)" value={whatsapp} onChange={setWhatsapp} />
        <TextField
          label="Solde de caisse initial (HTG)"
          value={opening}
          onChange={setOpening}
          type="number"
          step="0.01"
          inputMode="decimal"
        />
        <SubmitButton loading={saving}>Enregistrer</SubmitButton>
      </form>

      <section className="mt-6 px-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sauvegarde des données
        </h2>
        <div className="card-surface p-4">
          <div className="flex items-start gap-3">
            <DatabaseBackup className="mt-0.5 size-5 text-primary" />
            <p className="text-xs text-muted-foreground">
              Téléchargez un fichier contenant toutes vos données (clients, produits, ventes, achats,
              paiements, dépenses, caisse, stock, historique). Gardez-le en lieu sûr : il permet de tout
              restaurer si vous changez de téléphone ou perdez vos données.
            </p>
          </div>
          <button
            onClick={async () => {
              setBackingUp(true);
              try {
                const file = await buildBackup();
                downloadBackup(file);
                toast.success(`Sauvegarde téléchargée (${backupTotal(file)} enregistrements)`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Sauvegarde impossible");
              } finally {
                setBackingUp(false);
              }
            }}
            disabled={backingUp}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Download className="size-4" />
            {backingUp ? "Préparation…" : "Télécharger la sauvegarde"}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                setPending(parseBackup(await f.text()));
                setRestoreText("");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Fichier invalide");
              }
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-semibold"
          >
            <Upload className="size-4" /> Restaurer depuis un fichier
          </button>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Zone sensible
        </h2>
        <div className="card-surface border border-destructive/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Réinitialiser l'historique</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supprime définitivement toutes les ventes, achats, paiements, dépenses, mouvements de
                caisse et retours. Vos clients, produits et fournisseurs sont conservés.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="mt-4 w-full rounded-full bg-destructive py-3 text-sm font-semibold text-destructive-foreground"
          >
            Réinitialiser l'historique
          </button>
        </div>
      </section>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmer la réinitialisation">
        <form onSubmit={doReset} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Tapez <strong>REINITIALISER</strong> pour confirmer.
          </p>
          <TextField label="Confirmation" value={confirmText} onChange={setConfirmText} />
          <label className="flex items-start gap-3 rounded-2xl border border-input px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={resetStock}
              onChange={(e) => setResetStock(e.target.checked)}
              className="mt-0.5 size-5 accent-[var(--color-primary)]"
            />
            <span>Remettre aussi tous les stocks à zéro</span>
          </label>
          <SubmitButton loading={reset.isPending}>Tout supprimer</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
