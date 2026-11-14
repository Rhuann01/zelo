import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "emerald" | "amber" | "rose" | "blue";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--zelo-soft)] text-[var(--zelo-muted)]",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
};

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--zelo-subtle)]",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-sky-500",
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

/**
 * Selo compacto para status operacionais, planos e sinais financeiros.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  icon,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight ${BADGE_TONES[tone]} ${className}`.trim()}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_TONES[tone]}`}
          aria-hidden="true"
        />
      ) : null}
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
