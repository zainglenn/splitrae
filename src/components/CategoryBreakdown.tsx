"use client";

import { Expense, CATEGORY_META, Category } from "@/types/expense";
import { SummaryRow } from "@/components/SummaryRow";

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
    <div className="flex flex-col divide-y">
      {sorted.map(([cat, { amount, count }]) => {
        const meta = CATEGORY_META[cat];
        const isActive = activeCategory === cat;
        return (
          <SummaryRow
            key={cat}
            icon={
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
                style={{ backgroundColor: meta.color + "20" }}
              >
                {meta.emoji}
              </span>
            }
            label={cat}
            sublabel={`${count} ${count === 1 ? "tx" : "txs"}`}
            value={fmt.format(amount)}
            onClick={() => onFilterCategory?.(isActive ? null : cat)}
            active={isActive}
          />
        );
      })}
    </div>
  );
}
