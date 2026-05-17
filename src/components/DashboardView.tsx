"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { CATEGORY_META, Category } from "@/types/expense";
import { Loader2 } from "lucide-react";

interface Props {
  userId: string;
  year: number;
  onMonthClick: (month: string) => void;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
  });
}

export function DashboardView({ userId, year, onMonthClick }: Props) {
  const { monthStats, categoryTotals, grandTotal, loading } = useDashboardStats(userId, year);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxMonthTotal = Math.max(...monthStats.map((m) => m.total), 1);
  const sortedCategories = (Object.entries(categoryTotals) as [Category, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      {/* Year total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">{year} Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{fmt.format(grandTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              across {monthStats.length} month{monthStats.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {fmt.format(monthStats.length ? grandTotal / monthStats.length : 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per active month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Monthly breakdown bars */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Month by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {monthStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded for {year} yet.</p>
            ) : (
              <ul className="space-y-3">
                {monthStats.map((stat) => {
                  const pct = (stat.total / maxMonthTotal) * 100;
                  return (
                    <li key={stat.month}>
                      <button
                        className="w-full text-left group"
                        onClick={() => onMonthClick(stat.month)}
                      >
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium group-hover:text-primary transition-colors">
                            {formatMonthLabel(stat.month)}
                          </span>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="text-xs">{stat.count} expenses</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmt.format(stat.total)}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top categories */}
        {sortedCategories.length > 0 && (
          <Card className="border-0 shadow-sm h-fit">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-sm font-semibold">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {sortedCategories.map(([cat, amount]) => {
                  const meta = CATEGORY_META[cat];
                  const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                  return (
                    <li key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{meta.emoji}</span>
                          <span className="font-medium" style={{ color: meta.color }}>{cat}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="tabular-nums text-foreground font-semibold">{fmt.format(amount)}</span>
                          <span className="text-xs w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
