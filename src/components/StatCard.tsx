"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClass?: string;
  iconBgClass?: string;
  valueClass?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, iconClass, iconBgClass, valueClass }: Props) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${iconBgClass ?? "bg-accent"}`}>
          <Icon className={`h-4 w-4 ${iconClass ?? "text-primary"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-xl sm:text-2xl font-bold tabular-nums ${valueClass ?? ""}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
