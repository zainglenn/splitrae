"use client";

import { cn } from "@/lib/utils";

interface Props {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  sublabel?: string;
  value: React.ReactNode;
  subvalue?: string;
  actions?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function SummaryRow({
  icon,
  label,
  badge,
  sublabel,
  value,
  subvalue,
  actions,
  onClick,
  active,
  className,
}: Props) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={cn(
        "flex items-center gap-3 px-1 py-2.5 w-full text-left transition-colors focus:outline-none",
        onClick && "hover:bg-muted/40",
        active && "bg-muted/40",
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <span className="shrink-0">{icon}</span>

      {/* Label + sublabel */}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-slate-700 truncate">{label}</span>
          {badge && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
              {badge}
            </span>
          )}
        </span>
        {sublabel && (
          <span className="block text-xs text-muted-foreground mt-0.5">{sublabel}</span>
        )}
      </span>

      {/* Value + subvalue */}
      <span className="text-right shrink-0">
        <span className="block text-sm font-semibold tabular-nums text-slate-800">{value}</span>
        {subvalue && (
          <span className="block text-xs text-muted-foreground">{subvalue}</span>
        )}
      </span>

      {/* Actions */}
      {actions && <span className="shrink-0 flex items-center gap-1">{actions}</span>}
    </Tag>
  );
}
