import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, NotebookPen, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cahier Pro — Votre cahier de comptes, en mieux" },
      {
        name: "description",
        content:
          "Ventes, clients, stock, dettes, caisse et bénéfices en HTG. Une application simple pour gérer une petite activité.",
      },
      { property: "og:title", content: "Cahier Pro — Votre cahier de comptes, en mieux" },
      {
        property: "og:description",
        content: "Gérez ventes, clients, stock, dettes et bénéfices depuis votre téléphone.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: NotebookPen, title: "Ventes en 30 secondes", text: "Client, produit, quantité, payé. C'est tout." },
  { icon: Wallet, title: "Dettes et caisse suivies", text: "Chaque gourde entrée ou sortie est tracée." },
  { icon: BarChart3, title: "Bénéfices calculés", text: "Marge brute et bénéfice net, automatiquement." },
  { icon: ShieldCheck, title: "Vos données protégées", text: "Vous seul accédez à votre commerce." },
];

function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/tableau-de-bord", replace: true });
      else setChecked(true);
    });
  }, [navigate]);

  if (!checked) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-14">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cahier Pro</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight">
        Votre cahier de comptes, <span className="text-primary">en mieux</span>.
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Suivez vos ventes, vos clients, votre stock et vos bénéfices en gourdes — sans rien connaître
        à la comptabilité.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/auth"
          className="rounded-full bg-primary px-6 py-3.5 text-center text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          Créer mon compte
        </Link>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="rounded-full border border-border bg-card px-6 py-3.5 text-center text-sm font-semibold transition-transform active:scale-95"
        >
          J'ai déjà un compte
        </Link>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card-surface p-5">
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
