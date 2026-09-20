import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BellRing,
  ReceiptText,
  Search,
  ChevronRight,
  Clock,
  HandCoins,
  LogOut,
  Receipt,
  Settings,
  Sparkles,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/plus")({
  head: () => ({
    meta: [
      { title: "Plus — Cahier Pro" },
      { name: "description", content: "Achats, fournisseurs, caisse, rapports, dépenses et compte." },
      { property: "og:title", content: "Plus — Cahier Pro" },
      { property: "og:description", content: "Tous les modules de gestion de votre commerce." },
    ],
  }),
  component: MorePage,
});

const GROUPS: { title: string; links: { to: string; label: string; icon: typeof Receipt }[] }[] = [
  {
    title: "Ventes et reçus",
    links: [
      { to: "/recus", label: "Reçus", icon: ReceiptText },
      { to: "/recherche", label: "Recherche globale", icon: Search },
      { to: "/rappels", label: "Rappels de dettes", icon: BellRing },
    ],
  },
  {
    title: "Argent",
    links: [
      { to: "/depenses", label: "Dépenses", icon: Receipt },
      { to: "/a-recevoir", label: "À recevoir (clients)", icon: HandCoins },
      { to: "/a-payer", label: "À payer (fournisseurs)", icon: HandCoins },
      { to: "/caisse", label: "Caisse et clôture", icon: Wallet },
    ],
  },
  {
    title: "Approvisionnement",
    links: [
      { to: "/achats", label: "Achats", icon: ShoppingBag },
      { to: "/fournisseurs", label: "Fournisseurs", icon: Truck },
    ],
  },
  {
    title: "Analyse et compte",
    links: [
      { to: "/assistant", label: "Assistant financier", icon: Sparkles },
      { to: "/rapports", label: "Rapports et exports", icon: BarChart3 },
      { to: "/historique", label: "Historique", icon: Clock },
      { to: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

function MorePage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  return (
    <div className="pb-6">
      <PageHeader title="Plus" subtitle={profile?.business_name || profile?.full_name || ""} />

      {GROUPS.map((group) => (
        <section key={group.title} className="mb-5">
          <h2 className="px-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </h2>
          <div className="card-surface mx-4 divide-y divide-border">
            {group.links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={to as any}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <Icon className="size-5 text-primary" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
        }}
        className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-destructive/10 py-3.5 text-sm font-semibold text-destructive"
      >
        <LogOut className="size-4" /> Se déconnecter
      </button>
    </div>
  );
}
