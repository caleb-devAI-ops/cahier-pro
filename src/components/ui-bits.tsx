import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-6 pb-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "primary";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-lg font-semibold tabular", toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Money({
  value,
  className,
  tone,
}: {
  value: unknown;
  className?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <span
      className={cn(
        "tabular",
        tone === "positive" && "text-success",
        tone === "negative" && "text-destructive",
        className,
      )}
    >
      {formatMoney(value)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  to,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  to?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card-surface mx-4 flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon ? <div className="text-primary">{icon}</div> : null}
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          {actionLabel}
        </button>
      ) : null}
      {actionLabel && to && !onAction ? (
        <Link
          to={to}
          className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function LoadingList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-surface h-20 animate-pulse bg-muted/60" />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="card-surface mx-4 border border-destructive/30 p-4 text-sm">
      <p className="font-semibold text-destructive">Une erreur est survenue</p>
      <p className="mt-1 text-muted-foreground">{message ?? "Réessayez dans un instant."}</p>
    </div>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "success" | "warning" | "destructive" | "muted" | "primary";
}) {
  const map = {
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
    primary: "bg-primary/12 text-primary",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", map[tone])}>{label}</span>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  rightSub,
  onClick,
  to,
  params,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  rightSub?: ReactNode;
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-semibold tabular">{right}</div>
        {rightSub ? <div className="mt-0.5 text-xs text-muted-foreground">{rightSub}</div> : null}
      </div>
    </>
  );
  const base =
    "card-surface flex w-full items-center gap-3 px-4 py-3.5 text-left transition-transform active:scale-[0.99]";
  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} params={params as any} className={base}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      {body}
    </button>
  );
}
