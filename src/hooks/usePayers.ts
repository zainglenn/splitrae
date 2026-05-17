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
      .select("id, name, color, is_owner")
      .eq("user_id", userId)
      .order("is_owner", { ascending: false }) // owner always first
      .order("created_at");
    const list = (data as Payer[]) ?? [];

    // Auto-create the owner payer on first use
    if (!list.some((p) => p.is_owner)) {
      await supabase.from("payers").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name: "You",
        color: "#6366f1",
        is_owner: true,
      });
      // Re-fetch after creating
      const { data: refreshed } = await supabase
        .from("payers")
        .select("id, name, color, is_owner")
        .eq("user_id", userId)
        .order("is_owner", { ascending: false })
        .order("created_at");
      setPayers((refreshed as Payer[]) ?? []);
    } else {
      setPayers(list);
    }
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
