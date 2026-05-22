"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PayerYearlyBalance {
  share: number;   // what this payer owes (split total / numPayers)
  paid: number;    // what this payer has already recorded as paid
  balance: number; // share - paid (positive = still owes, negative = overpaid)
  loading: boolean;
}

export function usePayerYearlyBalance(
  ownerId: string,
  payerId: string | null,
  numPayers: number,
  year: number
): PayerYearlyBalance {
  const [state, setState] = useState<PayerYearlyBalance>({
    share: 0,
    paid: 0,
    balance: 0,
    loading: true,
  });

  useEffect(() => {
    if (!payerId || numPayers === 0) {
      setState({ share: 0, paid: 0, balance: 0, loading: false });
      return;
    }

    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const monthPrefix = `${year}-`;

    Promise.all([
      supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", ownerId)
        .eq("split", true)
        .gte("date", from)
        .lte("date", to),
      supabase
        .from("payments")
        .select("amount")
        .eq("user_id", ownerId)
        .eq("payer_id", payerId)
        .like("month", `${monthPrefix}%`),
    ]).then(([expensesRes, paymentsRes]) => {
      const totalSplit = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
      const totalPaid = (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const share = totalSplit / numPayers;
      setState({ share, paid: totalPaid, balance: share - totalPaid, loading: false });
    });
  }, [ownerId, payerId, numPayers, year]);

  return state;
}
