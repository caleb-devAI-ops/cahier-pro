import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BanknoteArrowDown,
  Home,
  LayoutGrid,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  Users,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/tableau-de-bord", label: "Accueil", icon: Home },
  { to: "/ventes", label: "Ventes", icon: Receipt },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/produits", label: "Produits", icon: Package },
  { to: "/plus", label: "Plus", icon: LayoutGrid },
] as const;

const QUICK = [
  { to: "/ventes/nouvelle", label: "Nouvelle vente", icon: Receipt },
  { to: "/clients?nouveau=1", label: "Nouveau client", icon: UserPlus },
  { to: "/produits?nouveau=1", label: "Nouveau produit", icon: Package },
  { to: "/depenses?nouveau=1", label: "Nouvelle dépense", icon: BanknoteArrowDown },
  { to: "/a-recevoir", label: "Nouveau paiement", icon: Wallet },
  { to: "/achats?nouveau=1", label: "Nouvel achat", icon: ShoppingBag },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-background pb-28">
      {children}

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm animate-in fade-in"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl rounded-t-3xl bg-card p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Action rapide</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded-full bg-muted p-2 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setOpen(false);
                  const [path, search] = q.to.split("?");
                  navigate({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to: path as any,
                    search: search ? { nouveau: "1" } : undefined,
                  });
                }}
                className="flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4 text-left transition-transform active:scale-95"
              >
                <q.icon className="size-5 text-primary" />
                <span className="text-sm font-medium leading-tight">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-3xl safe-bottom border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-5 items-end px-1 pt-2">
          {NAV.map((item, index) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <div key={item.to} className="flex flex-col items-center">
                {index === 2 ? (
                  <button
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Actions rapides"
                    className="-mt-8 mb-1 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-90"
                  >
                    <Plus className={cn("size-7 transition-transform", open && "rotate-45")} />
                  </button>
                ) : null}
                {index !== 2 ? (
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={item.to as any}
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    to="/clients"
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-xl pb-1.5 text-[11px] font-medium transition-colors",
                      pathname.startsWith("/clients") ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
