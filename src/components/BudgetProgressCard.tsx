"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Sparkles } from "lucide-react";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const spent: Partial<Record<Category, number>> = {};
  for (const e of expenses) {
    spent[e.category] = (spent[e.category] ?? 0) + e.amount;
  }

  // Only show categories with spending this month; track how many have none
  const activeRows = budgets.filter((b) => (spent[b.category as Category] ?? 0) > 0);
  const emptyCount = budgets.length - activeRows.length;

  return (
    <CollapsibleCard
      title="Budget Tracker"
      noPadding
      headerExtra={
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-primary" onClick={onManageBudgets}>
          <Settings2 className="h-3.5 w-3.5" />
          <span className="text-xs">Manage</span>
        </Button>
      }
    >
      {activeRows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 px-5">No spending recorded this month yet.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="w-[180px]">Category</TableHead>
                <TableHead className="text-right w-[120px]">Spent</TableHead>
                <TableHead className="text-right w-[120px]">Budget</TableHead>
                <TableHead className="hidden sm:table-cell">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRows.map((budget) => {
                const cat = budget.category as Category;
                const meta = CATEGORY_META[cat];
                const amountSpent = spent[cat] ?? 0;
                const pct = Math.min((amountSpent / budget.amount) * 100, 100);
                const over = amountSpent > budget.amount;

                return (
                  <TableRow key={cat}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{meta.emoji}</span>
                        <span className="font-medium text-slate-700">{cat}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(amountSpent)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmt.format(budget.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : "bg-primary/60"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                        {over && <span className="text-xs font-semibold text-rose-600 w-6">over</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {emptyCount > 0 && (
            <p className="text-xs text-muted-foreground px-5 py-2.5 border-t">
              {emptyCount} budgeted {emptyCount === 1 ? "category" : "categories"} with no spending this month
            </p>
          )}
        </>
      )}
    </CollapsibleCard>
  );
}
