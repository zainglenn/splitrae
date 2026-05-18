"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Expense } from "@/types/expense";

interface Props {
  expenses: Expense[];
  month: string;
}

export function AIInsightsCard({ expenses, month }: Props) {
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Use a ref to track the last successfully fetched key — does NOT trigger re-renders
  const lastFetchedRef = useRef("");

  useEffect(() => {
    if (expenses.length <= 3) return;
    const key = `${month}:${expenses.length}`;
    if (lastFetchedRef.current === key) return;

    let cancelled = false;
    setLoading(true);
    setInsights(null);

    fetch("/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenses: expenses.map(({ description, amount, category, date }) => ({
          description,
          amount,
          category,
          date,
        })),
        month,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.insights) && data.insights.length > 0) {
          setInsights(data.insights);
          lastFetchedRef.current = key;
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, expenses.length]);

  if (expenses.length <= 3) return null;

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <span>✨</span> Monthly Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 pb-5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <span>✨</span> Monthly Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-violet-400 mt-0.5 shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
