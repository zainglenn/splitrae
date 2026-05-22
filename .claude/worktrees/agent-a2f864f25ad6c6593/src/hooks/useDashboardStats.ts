"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Expense, Category } from "@/types/expense";

export interface MonthStat {
  month: string;
  total: number;
  count: number;
  topCategory?: Category;
}

export interface DashboardStats {
  monthStats: MonthStat[];
  categoryTotals: Partial<Record<Category, number>>;
  grandTotal: number;
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

  // Real-time: re-fetch whenever any expense changes for this user
  useEffect(() => {
    const channel = supabase
      .channel(`dashboard:${userId}:${year}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${userId}`,
        },
        () => fetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, year, fetch]);

  const monthStats: MonthStat[] = [];
  const monthMap: Record<string, { total: number; count: number }> = {};
  const monthCategoryMap: Record<string, Partial<Record<Category, number>>> = {};
  const categoryTotals: Partial<Record<Category, number>> = {};
  let grandTotal = 0;

  for (const e of expenses) {
    const month = e.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { total: 0, count: 0 };
    monthMap[month].total += e.amount;
    monthMap[month].count += 1;
    if (!monthCategoryMap[month]) monthCategoryMap[month] = {};
    monthCategoryMap[month][e.category as Category] = (monthCategoryMap[month][e.category as Category] ?? 0) + e.amount;
    categoryTotals[e.category as Category] = (categoryTotals[e.category as Category] ?? 0) + e.amount;
    grandTotal += e.amount;
  }

  for (const [month, stat] of Object.entries(monthMap)) {
    const catEntries = Object.entries(monthCategoryMap[month] ?? {}) as [Category, number][];
    const topCategory = catEntries.sort((a, b) => b[1] - a[1])[0]?.[0];
    monthStats.push({ month, ...stat, topCategory });
  }
  monthStats.sort((a, b) => a.month.localeCompare(b.month));

  return { monthStats, categoryTotals, grandTotal, loading };
}
