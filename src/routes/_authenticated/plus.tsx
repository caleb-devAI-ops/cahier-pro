import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock,
  HandCoins,
  LogOut,
  Receipt,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/plus")({
  head: () => ({
    meta: [
      { title: "Plus — Cahier Pro" },
      { name: "description", content: "Dépenses, créances, historique et compte." },
      { property: "og:title", content: "Plus — Cahier Pro" },
      { property: "og:description", content: "Dépenses, créances, historique et compte." },
    ],
  }),
  component: MorePage,
});

const LINKS = [
  { to: "/depenses", label: "Dépenses", icon: Receipt },
  { to: "/a-recevoir", label: "À recevoir", icon: HandCoins },
  { to: "/historique", label: "Historique", icon: Clock },
] as const;

const SOON = ["Achats et fournisseurs", "Caisse et clôture", "Rapports et exports", "Paramètres"];

function MorePage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  return (
    <div className="pb-6">
      <PageHeader title="Plus" subtitle={profile?.business_name || profile?.full_name || undefined} />

      <div className="card-surface mx-4 divide-y divide-border">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="size-5 text-primary" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <section className="mt-6 px-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prochainement
        </h2>
        <div className="card-surface divide-y divide-border">
          {SOON.map((label) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <Wallet className="size-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{label}</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                à venir
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ces modules ne sont pas encore actifs : rien n'est affiché de faux tant qu'ils ne
          fonctionnent pas.
        </p>
      </section>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
        }}
        className="mx-4 mt-6 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-destructive/10 py-3.5 text-sm font-semibold text-destructive"
      >
        <LogOut className="size-4" /> Se déconnecter
      </button>
    </div>
  );
}
