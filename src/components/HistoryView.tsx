"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Props {
  userId: string;
  onMonthClick: (month: string) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function HistoryView({ userId, onMonthClick }: Props) {
  const [monthData, setMonthData] = useState<{ month: string; total: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("expenses")
      .select("date, amount")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        // Aggregate by YYYY-MM
        const map = new Map<string, { total: number; count: number }>();
        for (const row of data) {
          const key = row.date.slice(0, 7); // YYYY-MM
          const existing = map.get(key) ?? { total: 0, count: 0 };
          map.set(key, { total: existing.total + row.amount, count: existing.count + 1 });
        }

        const result = Array.from(map.entries())
          .map(([month, { total, count }]) => ({ month, total, count }))
          .sort((a, b) => b.month.localeCompare(a.month));

        setMonthData(result);
        setLoading(false);
      });
  }, [userId]);

  const years = useMemo(() => {
    const set = new Set(monthData.map((d) => d.month.split("-")[0]));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [monthData]);

  const currentMonthKey = toMonthKey(new Date());
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Default to the most recent year with data
  useEffect(() => {
    if (years.length > 0 && !selectedYear) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (monthData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-2">
        <p className="font-medium text-slate-500">No history yet</p>
        <p className="text-sm">Add expenses to a month and they'll appear here.</p>
      </div>
    );
  }

  const monthsForYear = monthData.filter((d) => d.month.startsWith(selectedYear));

  return (
    <div className="space-y-5">
      {/* Year tabs */}
      <div className="flex gap-2 flex-wrap">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedYear === year
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {monthsForYear.map(({ month, total, count }) => {
          const [, m] = month.split("-");
          const monthName = MONTH_NAMES[Number(m) - 1];
          const isCurrentMonth = month === currentMonthKey;

          return (
            <button
              key={month}
              onClick={() => onMonthClick(month)}
              className="group relative rounded-xl border bg-card p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {isCurrentMonth && (
                <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  current
                </span>
              )}
              <p className="text-base font-semibold text-slate-800">{monthName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{count} transactions</p>
              <p className="text-sm font-bold tabular-nums text-slate-700 mt-2">{fmt.format(total)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
