"use client";

import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: Props) {
  return (
    <div className={cn("space-y-5", className)}>
      {children}
    </div>
  );
}
