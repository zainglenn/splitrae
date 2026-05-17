"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Expense, MonthKey } from "@/types/expense";

export function useExpenses(month: MonthKey, userId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, mon] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = new Date(year, mon, 0).toISOString().slice(0, 10); // last day of month

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("id, description, amount, category, date, split")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false });

    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [userId, from, to]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Real-time sync across devices
  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${userId}:${month}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchExpenses()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, month, fetchExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, "id">) => {
    await supabase.from("expenses").insert({
      ...expense,
      user_id: userId,
      id: crypto.randomUUID(),
    });
    await fetchExpenses();
  }, [userId, fetchExpenses]);

  const updateExpense = useCallback(async (id: string, updates: Omit<Expense, "id">) => {
    await supabase.from("expenses").update(updates).eq("id", id).eq("user_id", userId);
    await fetchExpenses();
  }, [userId, fetchExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
    await fetchExpenses();
  }, [userId, fetchExpenses]);

  return { expenses, loading, addExpense, updateExpense, deleteExpense };
}
