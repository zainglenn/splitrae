"use client";

import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ title, description, children, className }: Props) {
  return (
    <div className={cn("rounded-xl border-0 bg-card shadow-sm", className)}>
      {(title || description) && (
        <div className="px-5 pt-5 pb-3 border-b">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
