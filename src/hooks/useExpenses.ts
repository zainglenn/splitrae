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

  const fetchExpenses = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("id, description, amount, category, date, is_recurring, installment_id, installment_index, installment_total")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false });

    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [userId, from, to]);

  useEffect(() => {
    fetchExpenses(true);
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
    await fetchExpenses(false);
  }, [userId, fetchExpenses]);

  const updateExpense = useCallback(async (id: string, updates: Omit<Expense, "id">) => {
    await supabase.from("expenses").update(updates).eq("id", id).eq("user_id", userId);
    await fetchExpenses(false);
  }, [userId, fetchExpenses]);

  const deleteExpense = useCallback(async (id: string, installmentId?: string | null) => {
    if (installmentId) {
      await supabase.from("expenses").delete()
        .eq("installment_id", installmentId).eq("user_id", userId);
    } else {
      await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
    }
    await fetchExpenses(false);
  }, [userId, fetchExpenses]);

  const convertToInstallments = useCallback(async (expense: Expense, months: number) => {
    const monthlyAmount = Math.round((expense.amount / months) * 100) / 100;
    const installment_id = crypto.randomUUID();
    const origin = new Date(expense.date + "T00:00:00");
    const rows = Array.from({ length: months }, (_, i) => {
      let date: string;
      if (i === 0) {
        date = expense.date;
      } else {
        const d = new Date(origin);
        d.setMonth(d.getMonth() + i, 1);
        date = d.toISOString().slice(0, 10);
      }
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        description: expense.description,
        amount: monthlyAmount,
        category: expense.category,
        date,
        is_recurring: false,
        installment_id,
        installment_index: i + 1,
        installment_total: months,
      };
    });
    await supabase.from("expenses").delete().eq("id", expense.id).eq("user_id", userId);
    await supabase.from("expenses").insert(rows);
    await fetchExpenses(false);
  }, [userId, fetchExpenses]);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, convertToInstallments };
}
