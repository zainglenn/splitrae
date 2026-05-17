"use client";

import { Expense, CATEGORY_META } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Receipt } from "lucide-react";

interface Props {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Receipt className="h-7 w-7 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-500">No expenses yet</p>
          <p className="text-sm mt-0.5">Tap <strong className="text-primary">Add</strong> to record your first expense.</p>
        </div>
      </div>
    );
  }

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <ul className="space-y-2">
      {sorted.map((expense) => {
        const meta = CATEGORY_META[expense.category];
        return (
          <li
            key={expense.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            {/* Category icon circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: meta.color + "18" }}
            >
              {meta.emoji}
            </div>

            {/* Description + meta */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate leading-tight">{expense.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: meta.color + "18", color: meta.color }}
                >
                  {expense.category}
                </span>
                <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
              </div>
            </div>

            {/* Amount */}
            <span className="font-bold tabular-nums text-slate-800 shrink-0">
              {fmt.format(expense.amount)}
            </span>

            {/* Actions — always visible on touch, fade-in on desktop hover */}
            <div className="flex gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-slate-400 hover:text-primary hover:bg-accent"
                onClick={() => onEdit(expense)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                onClick={() => onDelete(expense.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
