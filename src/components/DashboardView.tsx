"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { usePayerYearlyBalance } from "@/hooks/usePayerYearlyBalance";
import { CATEGORY_META, Category } from "@/types/expense";
import {
  Loader2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Activity,
  Wallet,
} from "lucide-react";

interface Props {
  userId: string;
  year: number;
  myPayerId: string | null;
  numPayers: number;
  onMonthClick: (month: string) => void;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtExact = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

function formatMonthLabel(key: string, short = false) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: short ? "short" : "long",
  });
}

function getBarColor(total: number, avg: number): string {
  if (avg === 0) return "#4f46e5";
  const ratio = total / avg;
  if (ratio < 0.85) return "#16a34a";
  if (ratio < 1.15) return "#4f46e5";
  if (ratio < 1.40) return "#f59e0b";
  return "#ef4444";
}

export function DashboardView({ userId, year, myPayerId, numPayers, onMonthClick }: Props) {
  const { monthStats, categoryTotals, grandTotal, loading } = useDashboardStats(userId, year);
  const yearlyBalance = usePayerYearlyBalance(userId, myPayerId, numPayers, year);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = monthStats.length > 0;
  const avgMonthly = monthStats.length ? grandTotal / monthStats.length : 0;
  const maxMonthTotal = Math.max(...monthStats.map((m) => m.total), 1);
  const peakMonth = hasData ? monthStats.reduce((mx, m) => (m.total > mx.total ? m : mx), monthStats[0]) : null;
  const sortedCategories = (Object.entries(categoryTotals) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] ?? null;

  // Trend: first half avg vs second half avg
  const trendData = (() => {
    if (monthStats.length < 4) return null;
    const mid = Math.floor(monthStats.length / 2);
    const firstHalf = monthStats.slice(0, mid);
    const secondHalf = monthStats.slice(-mid);
    const avgFirst = firstHalf.reduce((s, m) => s + m.total, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + m.total, 0) / secondHalf.length;
    const pct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
    return {
      pct: Math.abs(pct),
      direction: pct > 5 ? "up" : pct < -5 ? "down" : "stable",
    };
  })();

  // Total transactions
  const totalTxns = monthStats.reduce((s, m) => s + m.count, 0);
  const busiestMonth = hasData
    ? monthStats.reduce((mx, m) => (m.count > mx.count ? m : mx), monthStats[0])
    : null;

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">{year} Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">{fmt.format(grandTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthStats.length} month{monthStats.length !== 1 ? "s" : ""} tracked
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Avg</CardTitle>
            {trendData && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  trendData.direction === "up"
                    ? "bg-rose-50 text-rose-600"
                    : trendData.direction === "down"
                    ? "bg-green-50 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {trendData.direction === "up" ? "↑" : trendData.direction === "down" ? "↓" : "→"}{" "}
                {Math.round(trendData.pct)}%
              </span>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">{fmt.format(avgMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {trendData
                ? trendData.direction === "up"
                  ? "trending up vs earlier"
                  : trendData.direction === "down"
                  ? "trending down vs earlier"
                  : "stable pace"
                : "per active month"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => peakMonth && onMonthClick(peakMonth.month)}>
          <CardHeader className="pb-1 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peak Month</CardTitle>
            <Flame className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            {peakMonth ? (
              <>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">{fmt.format(peakMonth.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatMonthLabel(peakMonth.month)} — tap to view</p>
              </>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${myPayerId && yearlyBalance.balance > 0 ? "ring-1 ring-rose-200 dark:ring-rose-900" : ""}`}>
          <CardHeader className="pb-1 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {myPayerId ? "You Owe" : "Your Share"}
            </CardTitle>
            <Wallet className={`h-4 w-4 ${myPayerId && yearlyBalance.balance > 0 ? "text-rose-500" : "text-blue-500"}`} />
          </CardHeader>
          <CardContent>
            {myPayerId ? (
              <>
                <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${yearlyBalance.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {fmt.format(Math.abs(yearlyBalance.balance))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {yearlyBalance.balance > 0
                    ? `${fmt.format(yearlyBalance.share)} share · ${fmt.format(yearlyBalance.paid)} paid`
                    : yearlyBalance.balance < 0
                    ? `overpaid by ${fmt.format(Math.abs(yearlyBalance.balance))}`
                    : "fully settled"}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">{fmt.format(grandTotal / (numPayers || 2))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {numPayers > 0 ? `1/${numPayers} of ${fmt.format(grandTotal)}` : `50% of ${fmt.format(grandTotal)}`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Month Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
              {hasData && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> below avg
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> on track
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> above avg
                  </span>
                </div>
              )}
            </div>
            {hasData && (
              <p className="text-xs text-muted-foreground mt-0.5">
                avg {fmtExact.format(avgMonthly)} / month
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded for {year} yet.</p>
            ) : (
              <ul className="space-y-4">
                {monthStats.map((stat, i) => {
                  const pct = (stat.total / maxMonthTotal) * 100;
                  const barColor = getBarColor(stat.total, avgMonthly);
                  const prev = i > 0 ? monthStats[i - 1] : null;
                  const delta = prev ? stat.total - prev.total : null;
                  const isCurrentMonth = stat.month === currentMonthKey;
                  const topCatMeta = stat.topCategory ? CATEGORY_META[stat.topCategory] : null;

                  return (
                    <li key={stat.month}>
                      <button
                        className="w-full text-left group"
                        onClick={() => onMonthClick(stat.month)}
                      >
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-medium group-hover:text-primary transition-colors truncate ${isCurrentMonth ? "text-primary" : ""}`}>
                              {formatMonthLabel(stat.month)}
                              {isCurrentMonth && <span className="ml-1.5 text-xs font-normal text-primary/70">(in progress)</span>}
                            </span>
                            {topCatMeta && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-md font-medium hidden sm:inline-flex items-center gap-0.5 flex-shrink-0"
                                style={{ backgroundColor: topCatMeta.color + "18", color: topCatMeta.color }}
                              >
                                {topCatMeta.emoji} {stat.topCategory}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {delta !== null && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium hidden sm:block ${
                                  delta > 0
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-green-50 text-green-700"
                                }`}
                              >
                                {delta > 0 ? "↑" : "↓"} {fmt.format(Math.abs(delta))}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground tabular-nums">{stat.count} items</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtExact.format(stat.total)}</span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isCurrentMonth ? "opacity-70" : ""}`}
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        {sortedCategories.length > 0 && (
          <Card className="border-0 shadow-sm h-fit">
            <CardHeader className="pb-3 pt-5">
              <CardTitle className="text-sm font-semibold">Spending Mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stacked proportional bar */}
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {sortedCategories.map(([cat, amount]) => {
                  const meta = CATEGORY_META[cat];
                  const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
                  if (pct < 1) return null;
                  return (
                    <div
                      key={cat}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      title={`${cat}: ${Math.round(pct)}%`}
                    />
                  );
                })}
              </div>

              {/* Category list */}
              <ul className="space-y-2.5">
                {sortedCategories.map(([cat, amount]) => {
                  const meta = CATEGORY_META[cat];
                  const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                  return (
                    <li key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm flex-shrink-0">{meta.emoji}</span>
                          <span className="font-medium truncate" style={{ color: meta.color }}>{cat}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{pct}%</span>
                          <span className="font-semibold tabular-nums text-foreground text-xs">{fmt.format(amount)}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insight strip */}
      {hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Spending trend */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !trendData || trendData.direction === "stable"
                    ? "bg-slate-100"
                    : trendData.direction === "up"
                    ? "bg-rose-50"
                    : "bg-green-50"
                }`}>
                  {!trendData || trendData.direction === "stable" ? (
                    <Minus className="h-4 w-4 text-slate-400" />
                  ) : trendData.direction === "up" ? (
                    <TrendingUp className="h-4 w-4 text-rose-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {!trendData
                      ? "Tracking spend"
                      : trendData.direction === "up"
                      ? `Up ${Math.round(trendData.pct)}% recently`
                      : trendData.direction === "down"
                      ? `Down ${Math.round(trendData.pct)}% recently`
                      : "Spending stable"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trendData
                      ? "second half vs first half of year"
                      : `${monthStats.length} months tracked so far`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top drain */}
          {topCategory && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                    style={{ backgroundColor: CATEGORY_META[topCategory[0]].color + "18" }}
                  >
                    {CATEGORY_META[topCategory[0]].emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {topCategory[0]} leads at{" "}
                      {grandTotal > 0 ? Math.round((topCategory[1] / grandTotal) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtExact.format(topCategory[1])} this year
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4 w-4 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {totalTxns} transactions
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {busiestMonth
                      ? `${formatMonthLabel(busiestMonth.month, true)} most active (${busiestMonth.count} items)`
                      : `across ${monthStats.length} months`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
