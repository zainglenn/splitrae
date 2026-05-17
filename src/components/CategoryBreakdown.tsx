"use client";

import { Expense, CATEGORY_META, Category } from "@/types/expense";

interface Props {
  expenses: Expense[];
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function CategoryBreakdown({ expenses }: Props) {
  if (expenses.length === 0) return null;

  const totals: Partial<Record<Category, number>> = {};
  let grand = 0;
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    grand += e.amount;
  }

  const sorted = (Object.entries(totals) as [Category, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {sorted.map(([cat, amount]) => {
        const pct = grand > 0 ? Math.round((amount / grand) * 100) : 0;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{meta.emoji}</span>
                <span className={`text-sm font-medium ${meta.text}`}>{cat}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {fmt.format(amount)}
                </span>
                <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{pct}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
