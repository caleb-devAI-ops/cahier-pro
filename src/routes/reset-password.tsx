import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Cahier Pro" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte Cahier Pro." },
      { property: "og:title", content: "Nouveau mot de passe — Cahier Pro" },
      { property: "og:description", content: "Réinitialisation du mot de passe Cahier Pro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisissez un mot de passe d'au moins 6 caractères.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none focus:border-primary"
        />
        <button
          disabled={loading}
          className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Un instant…" : "Enregistrer"}
        </button>
      </form>
    </main>
  );
}
