import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } =>
    search["mode"] ? { mode: search["mode"] as Mode } : {},
  head: () => ({
    meta: [
      { title: "Connexion — Cahier Pro" },
      { name: "description", content: "Connectez-vous à Cahier Pro pour gérer votre commerce." },
      { property: "og:title", content: "Connexion — Cahier Pro" },
      { property: "og:description", content: "Accédez à votre cahier de comptes Cahier Pro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/tableau-de-bord", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, business_name: businessName },
          },
        });
        if (error) throw error;
        if (data.session) {
          await supabase.from("profiles").upsert({
            id: data.session.user.id,
            full_name: fullName || null,
            business_name: businessName || null,
          });
          navigate({ to: "/tableau-de-bord", replace: true });
        } else {
          setSent("confirm");
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/tableau-de-bord", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Connexion Google impossible pour le moment.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="card-surface p-6 text-center">
          <h1 className="font-display text-xl font-semibold">
            {sent === "confirm" ? "Vérifiez votre e-mail" : "E-mail envoyé"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sent === "confirm"
              ? `Nous avons envoyé un lien de confirmation à ${email}. Cliquez dessus pour activer votre compte.`
              : `Un lien de réinitialisation a été envoyé à ${email}.`}
          </p>
          <button
            onClick={() => {
              setSent(null);
              setMode("login");
            }}
            className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Retour à la connexion
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cahier Pro</p>
      <h1 className="mt-3 text-3xl font-semibold">
        {mode === "signup" ? "Créer mon compte" : mode === "login" ? "Bon retour" : "Mot de passe oublié"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "forgot"
          ? "Entrez votre e-mail, nous vous enverrons un lien de réinitialisation."
          : "Vos données restent privées et accessibles depuis n'importe quel appareil."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signup" ? (
          <>
            <Field label="Votre nom" value={fullName} onChange={setFullName} placeholder="Jean Baptiste" />
            <Field
              label="Nom de l'entreprise"
              value={businessName}
              onChange={setBusinessName}
              placeholder="Boutique Espoir"
            />
          </>
        ) : null}
        <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" required />
        {mode !== "forgot" ? (
          <Field
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
            minLength={6}
          />
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
        >
          {loading
            ? "Un instant…"
            : mode === "signup"
              ? "Créer mon compte"
              : mode === "login"
                ? "Se connecter"
                : "Envoyer le lien"}
        </button>
      </form>

      {mode !== "forgot" ? (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-full border border-border bg-card py-3.5 text-sm font-semibold transition-transform active:scale-95"
          >
            Continuer avec Google
          </button>
        </>
      ) : null}

      <div className="mt-8 space-y-2 text-center text-sm">
        {mode === "login" ? (
          <>
            <button onClick={() => setMode("forgot")} className="text-muted-foreground underline">
              Mot de passe oublié ?
            </button>
            <p className="text-muted-foreground">
              Pas encore de compte ?{" "}
              <button onClick={() => setMode("signup")} className="font-semibold text-primary">
                S'inscrire
              </button>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            Déjà inscrit ?{" "}
            <button onClick={() => setMode("login")} className="font-semibold text-primary">
              Se connecter
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
