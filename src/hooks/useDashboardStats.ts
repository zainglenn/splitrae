"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Expense, Category } from "@/types/expense";

export interface MonthStat {
  month: string;
  total: number;
  count: number;
}

export interface DashboardStats {
  monthStats: MonthStat[];
  categoryTotals: Partial<Record<Category, number>>;
  grandTotal: number;
  splitTotal: number;
  loading: boolean;
}

export function useDashboardStats(userId: string, year: number): DashboardStats {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("id, description, amount, category, date, split")
      .eq("user_id", userId)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [userId, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const monthStats: MonthStat[] = [];
  const monthMap: Record<string, { total: number; count: number }> = {};
  const categoryTotals: Partial<Record<Category, number>> = {};
  let grandTotal = 0;
  let splitTotal = 0;

  for (const e of expenses) {
    const month = e.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { total: 0, count: 0 };
    monthMap[month].total += e.amount;
    monthMap[month].count += 1;
    categoryTotals[e.category as Category] = (categoryTotals[e.category as Category] ?? 0) + e.amount;
    grandTotal += e.amount;
    if (e.split) splitTotal += e.amount;
  }

  for (const [month, stat] of Object.entries(monthMap)) {
    monthStats.push({ month, ...stat });
  }
  monthStats.sort((a, b) => a.month.localeCompare(b.month));

  return { monthStats, categoryTotals, grandTotal, splitTotal, loading };
}
