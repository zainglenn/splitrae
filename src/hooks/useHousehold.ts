"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface HouseholdState {
  ownerId: string;      // userId to use for all data queries
  myPayerId: string | null;  // the payer record this user is linked to
  isGuest: boolean;     // true if this user is viewing someone else's household
  loading: boolean;
}

export function useHousehold(userId: string): HouseholdState {
  const [state, setState] = useState<HouseholdState>({
    ownerId: userId,
    myPayerId: null,
    isGuest: false,
    loading: true,
  });

  useEffect(() => {
    supabase
      .from("payers")
      .select("id, user_id")
      .eq("linked_user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Self-linked: owner payer linked to their own account → they're the household owner, not a guest
          const isGuest = data.user_id !== userId;
          setState({ ownerId: data.user_id, myPayerId: data.id, isGuest, loading: false });
        } else {
          setState({ ownerId: userId, myPayerId: null, isGuest: false, loading: false });
        }
      });
  }, [userId]);

  return state;
}
