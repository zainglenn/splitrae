"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/expense";

export interface InstallmentSeries {
  installment_id: string;
  description: string;
  category: Category;
  startDate: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMonths: number;
  pastCount: number;
  remainingCount: number;
  remainingAmount: number;
  rows: { date: string; amount: number; installment_index: number }[];
}

export function useInstallments(userId: string) {
  const [series, setSeries] = useState<InstallmentSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("expenses")
        .select("id, description, amount, category, date, installment_id, installment_index, installment_total")
        .eq("user_id", userId)
        .not("installment_id", "is", null)
        .order("date", { ascending: true });

      if (!data) { setLoading(false); return; }

      const today = new Date().toISOString().slice(0, 10);
      const grouped: Record<string, typeof data> = {};
      for (const row of data) {
        if (!row.installment_id) continue;
        (grouped[row.installment_id] ??= []).push(row);
      }

      const result: InstallmentSeries[] = Object.entries(grouped).map(([id, rows]) => {
        const sorted = [...rows].sort((a, b) => (a.installment_index ?? 0) - (b.installment_index ?? 0));
        const first = sorted[0];
        const totalMonths = first.installment_total ?? sorted.length;
        const totalAmount = sorted.reduce((s, r) => s + r.amount, 0);
        const pastCount = sorted.filter((r) => r.date <= today).length;
        const futureRows = sorted.filter((r) => r.date > today);
        const remainingAmount = futureRows.reduce((s, r) => s + r.amount, 0);
        return {
          installment_id: id,
          description: first.description,
          category: first.category as Category,
          startDate: first.date,
          totalAmount,
          monthlyAmount: sorted[0].amount,
          totalMonths,
          pastCount,
          remainingCount: futureRows.length,
          remainingAmount,
          rows: sorted.map((r) => ({ date: r.date, amount: r.amount, installment_index: r.installment_index ?? 0 })),
        };
      });

      // Active series first, then completed
      result.sort((a, b) => b.remainingCount - a.remainingCount || a.startDate.localeCompare(b.startDate));
      setSeries(result);
      setLoading(false);
    }

    load();
  }, [userId]);

  return { series, loading };
}
