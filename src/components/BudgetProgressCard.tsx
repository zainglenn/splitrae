"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Sparkles } from "lucide-react";
import { Expense, Budget, Category, CATEGORY_META } from "@/types/expense";

interface Props {
  expenses: Expense[];
  budgets: Budget[];
  onManageBudgets: () => void;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function BudgetProgressCard({ expenses, budgets, onManageBudgets }: Props) {
  if (budgets.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">No budgets set</p>
            <p className="text-xs text-muted-foreground mt-0.5">Let AI analyse your history and set limits automatically.</p>
          </div>
          <Button size="sm" className="gap-1.5 flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white" onClick={onManageBudgets}>
            <Sparkles className="h-3.5 w-3.5" />
            Generate
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Compute spent per category
  const spent: Partial<Record<Category, number>> = {};
  for (const e of expenses) {
    spent[e.category] = (spent[e.category] ?? 0) + e.amount;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className="text-sm font-semibold">Budget Tracker</CardTitle>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-primary" onClick={onManageBudgets}>
          <Settings2 className="h-3.5 w-3.5" />
          <span className="text-xs">Manage</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {budgets.map((budget) => {
          const cat = budget.category as Category;
          const meta = CATEGORY_META[cat];
          const amountSpent = spent[cat] ?? 0;
          const pct = Math.min((amountSpent / budget.amount) * 100, 100);
          const over = amountSpent > budget.amount;
          const warning = pct >= 70 && !over;

          const barColor = over
            ? "#ef4444"
            : warning
            ? "#f59e0b"
            : meta.color;

          return (
            <div key={cat} className="space-y-1">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-sm flex-shrink-0">{meta.emoji}</span>
                  <span className="text-sm font-medium text-slate-700 truncate">{cat}</span>
                  {over && (
                    <span className="text-xs font-semibold text-rose-600 flex-shrink-0">over</span>
                  )}
                </div>
                <span className="text-xs tabular-nums text-slate-500 flex-shrink-0">
                  {fmt.format(amountSpent)} / {fmt.format(budget.amount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
