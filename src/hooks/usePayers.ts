"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Payer } from "@/types/payer";

export function usePayers(userId: string) {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payers")
      .select("id, name, color")
      .eq("user_id", userId)
      .order("created_at");
    setPayers((data as Payer[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPayers(); }, [fetchPayers]);

  const addPayer = useCallback(async (name: string, color: string) => {
    await supabase.from("payers").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      color,
    });
    await fetchPayers();
  }, [userId, fetchPayers]);

  const deletePayer = useCallback(async (id: string) => {
    await supabase.from("payers").delete().eq("id", id).eq("user_id", userId);
    await fetchPayers();
  }, [userId, fetchPayers]);

  return { payers, loading, addPayer, deletePayer };
}
