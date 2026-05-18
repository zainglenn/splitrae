"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Payer } from "@/types/payer";

export function usePayers(userId: string) {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payers")
      .select("id, name, color, is_owner, linked_user_id")
      .eq("user_id", userId)
      .order("is_owner", { ascending: false }) // owner always first
      .order("created_at");

    // Only auto-create owner payer when the fetch succeeded with no owner present
    if (!error && data !== null && !data.some((p: Payer) => p.is_owner)) {
      await supabase.from("payers").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name: "You",
        color: "#6366f1",
        is_owner: true,
        linked_user_id: userId,
      });
      const { data: refreshed } = await supabase
        .from("payers")
        .select("id, name, color, is_owner, linked_user_id")
        .eq("user_id", userId)
        .order("is_owner", { ascending: false })
        .order("created_at");
      setPayers((refreshed as Payer[]) ?? []);
    } else if (!error && data !== null) {
      setPayers(data as Payer[]);
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

  const linkPayer = useCallback(async (payerId: string, linkedUserId: string) => {
    await supabase.from("payers").update({ linked_user_id: linkedUserId }).eq("id", payerId).eq("user_id", userId);
    await fetchPayers();
  }, [userId, fetchPayers]);

  const unlinkPayer = useCallback(async (payerId: string) => {
    await supabase.from("payers").update({ linked_user_id: null }).eq("id", payerId).eq("user_id", userId);
    await fetchPayers();
  }, [userId, fetchPayers]);

  return { payers, loading, addPayer, deletePayer, linkPayer, unlinkPayer };
}
