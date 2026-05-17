"use client";

import { Expense, CATEGORY_META, Category } from "@/types/expense";

interface Props {
  expenses: Expense[];
  onFilterCategory?: (cat: Category | null) => void;
  activeCategory?: Category | null;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function CategoryBreakdown({ expenses, onFilterCategory, activeCategory }: Props) {
  if (expenses.length === 0) return null;

  const totals: Partial<Record<Category, { amount: number; count: number }>> = {};
  for (const e of expenses) {
    if (!totals[e.category]) totals[e.category] = { amount: 0, count: 0 };
    totals[e.category]!.amount += e.amount;
    totals[e.category]!.count += 1;
  }

  const sorted = (Object.entries(totals) as [Category, { amount: number; count: number }][]).sort(
    (a, b) => b[1].amount - a[1].amount
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {sorted.map(([cat, { amount, count }]) => {
        const meta = CATEGORY_META[cat];
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onFilterCategory?.(isActive ? null : cat)}
            className="text-left rounded-xl p-3 border transition-all duration-150 hover:shadow-md active:scale-95 focus:outline-none"
            style={{
              backgroundColor: isActive ? meta.color + "18" : "white",
              borderColor: isActive ? meta.color + "60" : "transparent",
              boxShadow: isActive ? `0 0 0 2px ${meta.color}40` : undefined,
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-2"
              style={{ backgroundColor: meta.color + "20" }}
            >
              {meta.emoji}
            </div>
            <p className="text-xs font-medium text-slate-500 truncate">{cat}</p>
            <p className="text-base font-bold tabular-nums text-slate-800 leading-tight mt-0.5">
              {fmt.format(amount)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {count} {count === 1 ? "tx" : "txs"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
