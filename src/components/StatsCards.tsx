"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, CATEGORY_META, Category } from "@/types/expense";
import { TrendingUp, Receipt, Tag } from "lucide-react";

interface Props {
  expenses: Expense[];
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function StatsCards({ expenses }: Props) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const topCategory = (() => {
    const totals: Partial<Record<Category, number>> = {};
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    const sorted = (Object.entries(totals) as [Category, number][]).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  })();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{fmt.format(total)}</p>
          <p className="text-xs text-muted-foreground mt-1">this month</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-violet-600" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{expenses.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {expenses.length === 1 ? "expense" : "expenses"} recorded
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Tag className="h-4 w-4 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          {topCategory ? (
            <>
              <p className="text-2xl font-bold flex items-center gap-2">
                <span>{CATEGORY_META[topCategory[0]].emoji}</span>
                <span>{topCategory[0]}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{fmt.format(topCategory[1])} spent</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
