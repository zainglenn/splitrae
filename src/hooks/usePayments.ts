"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Payment } from "@/types/payer";

export function usePayments(month: string, userId: string) {
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, payer_id, amount, date, note, month")
      .eq("user_id", userId)
      .eq("month", month)
      .order("date", { ascending: false });
    setPayments((data as Payment[]) ?? []);
  }, [userId, month]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const addPayment = useCallback(async (data: {
    payer_id: string;
    amount: number;
    date: string;
    note: string;
    month: string;
  }) => {
    await supabase.from("payments").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      ...data,
    });
    await fetchPayments();
  }, [userId, fetchPayments]);

  const deletePayment = useCallback(async (id: string) => {
    await supabase.from("payments").delete().eq("id", id).eq("user_id", userId);
    await fetchPayments();
  }, [userId, fetchPayments]);

  return { payments, addPayment, deletePayment };
}
