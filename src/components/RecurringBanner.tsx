"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Expense } from "@/types/expense";

interface Props {
  currentMonth: string; // "YYYY-MM"
  currentExpenses: Expense[];
  prevMonthExpenses: Expense[];
  onAddRecurring: (expenses: Omit<Expense, "id">[]) => void;
}

export function RecurringBanner({ currentMonth, currentExpenses, prevMonthExpenses, onAddRecurring }: Props) {
  const missing = useMemo(() => {
    const recurring = prevMonthExpenses.filter((e) => e.is_recurring);
    if (recurring.length === 0) return [];

    const existingDescriptions = new Set(
      currentExpenses
        .filter((e) => e.is_recurring)
        .map((e) => e.description.toLowerCase().trim())
    );

    return recurring.filter(
      (e) => !existingDescriptions.has(e.description.toLowerCase().trim())
    );
  }, [prevMonthExpenses, currentExpenses]);

  if (missing.length === 0) return null;

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function handleAdd() {
    const toAdd = missing.map((e) => ({
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: defaultDate,
      split: true,
      is_recurring: true,
    }));
    onAddRecurring(toAdd);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
        <RefreshCw className="h-4 w-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-violet-900">
          {missing.length} recurring {missing.length === 1 ? "expense" : "expenses"} not added yet
        </p>
        <p className="text-xs text-violet-600 truncate">
          {missing.map((e) => e.description).join(", ")}
        </p>
      </div>
      <Button
        size="sm"
        className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
        onClick={handleAdd}
      >
        Add all
      </Button>
    </div>
  );
}
