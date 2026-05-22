"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, TrendingUp, Receipt, CalendarDays, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PageContainer } from "@/components/PageContainer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Props {
  userId: string;
  onMonthClick: (month: string) => void;
}

const fmt = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function HistoryView({ userId, onMonthClick }: Props) {
  const [monthData, setMonthData] = useState<{ month: string; total: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonthKey = toMonthKey(new Date());

  useEffect(() => {
    supabase
      .from("expenses")
      .select("date, amount")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const map = new Map<string, { total: number; count: number }>();
        for (const row of data) {
          const key = row.date.slice(0, 7);
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

  const stats = useMemo(() => {
    const historical = monthData.filter((d) => d.month !== currentMonthKey);
    const allTotal = monthData.reduce((s, d) => s + d.total, 0);
    const allCount = monthData.reduce((s, d) => s + d.count, 0);
    const avg = historical.length > 0 ? historical.reduce((s, d) => s + d.total, 0) / historical.length : 0;
    const peak = monthData.reduce((best, d) => (!best || d.total > best.total ? d : best), null as typeof monthData[0] | null);
    return { allTotal, allCount, avg, peak, monthCount: monthData.length };
  }, [monthData, currentMonthKey]);

  const chartData = useMemo(() => {
    if (monthData.length === 0) return [];
    const sorted = [...monthData].sort((a, b) => a.month.localeCompare(b.month));
    const dataMap = new Map(sorted.map((d) => [d.month, Math.round(d.total)]));
    const [startY, startM] = sorted[0].month.split("-").map(Number);
    const [endY, endM] = sorted[sorted.length - 1].month.split("-").map(Number);
    const points = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      points.push({
        label: new Date(y, m - 1, 1).toLocaleDateString("en-AE", { month: "short", year: "2-digit" }),
        total: dataMap.get(key) ?? 0,
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return points;
  }, [monthData]);

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

  // Bar scale relative to peak month
  const peakTotal = stats.peak?.total ?? 1;

  return (
    <PageContainer>
      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="All-Time Spend"
          value={fmtShort.format(stats.allTotal)}
          subtitle="AED total"
          icon={TrendingUp}
          iconBgClass="bg-blue-50"
          iconClass="text-blue-500"
        />
        <StatCard
          title="Avg / Month"
          value={fmtShort.format(stats.avg)}
          subtitle="AED average"
          icon={BarChart3}
          iconBgClass="bg-violet-50"
          iconClass="text-violet-500"
        />
        <StatCard
          title="Peak Month"
          value={stats.peak ? fmtShort.format(stats.peak.total) : "—"}
          subtitle={stats.peak ? formatMonthLabel(stats.peak.month) : undefined}
          icon={CalendarDays}
          iconBgClass="bg-amber-50"
          iconClass="text-amber-500"
        />
        <StatCard
          title="Transactions"
          value={String(stats.allCount)}
          subtitle={`across ${stats.monthCount} months`}
          icon={Receipt}
          iconBgClass="bg-emerald-50"
          iconClass="text-emerald-500"
        />
      </div>

      {/* Line chart */}
      {chartData.length > 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Total Spent per Month</CardTitle>
          </CardHeader>
          <CardContent className="pr-4 pb-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={36}
                />
                <Tooltip
                  formatter={(value) => [`AED ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`, "Total"]}
                  labelStyle={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  cursor={{ stroke: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#spendGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="pl-5">Month</TableHead>
                <TableHead className="hidden sm:table-cell">Spend</TableHead>
                <TableHead className="text-right w-[120px]">Transactions</TableHead>
                <TableHead className="text-right w-[150px] pr-5">Total (AED)</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthData.map(({ month, total, count }) => {
                const barPct = Math.round((total / peakTotal) * 100);
                const isCurrent = month === currentMonthKey;
                return (
                  <TableRow key={month} className="group">
                    <TableCell className="pl-5 font-medium">
                      <div className="flex items-center gap-2">
                        {formatMonthLabel(month)}
                        {isCurrent && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            current
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[160px] h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/50 transition-all"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8">{barPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{count}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold pr-5">{fmt.format(total)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onMonthClick(month)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
