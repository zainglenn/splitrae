"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  email: string;
  role: string;
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setLoading(false);
      });
  }, [userId]);

  return { profile, loading, isAdmin: profile?.role === "admin" };
}
