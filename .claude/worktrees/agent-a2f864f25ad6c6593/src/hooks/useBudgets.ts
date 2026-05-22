"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Budget, Category } from "@/types/expense";

export function useBudgets(userId: string, month = "") {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase
      .from("budgets")
      .select("id, category, amount")
      .eq("user_id", userId)
      .eq("month", month);
    setBudgets((data as Budget[]) ?? []);
    setLoading(false);
  }, [userId, month]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const setBudget = useCallback(async (category: Category, amount: number) => {
    await supabase.from("budgets").upsert(
      { user_id: userId, category, amount, month },
      { onConflict: "user_id,category,month" }
    );
    await fetchBudgets();
  }, [userId, month, fetchBudgets]);

  const deleteBudget = useCallback(async (category: Category) => {
    await supabase.from("budgets")
      .delete()
      .eq("user_id", userId)
      .eq("category", category)
      .eq("month", month);
    await fetchBudgets();
  }, [userId, month, fetchBudgets]);

  return { budgets, loading, setBudget, deleteBudget };
}
