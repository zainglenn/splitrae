"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInstallments } from "@/hooks/useInstallments";
import { PageContainer } from "@/components/PageContainer";

interface Props {
  userId: string;
}

function fmt(amount: number) {
  return amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SplitPayView({ userId }: Props) {
  const { series, loading } = useInstallments(userId);

  const active = series.filter((s) => s.remainingCount > 0);
  const completed = series.filter((s) => s.remainingCount === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground text-center py-16">No installment series found.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>

      {active.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Active ({active.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SeriesTable rows={active} />
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Completed ({completed.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SeriesTable rows={completed} dimmed />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

function SeriesTable({ rows, dimmed }: { rows: ReturnType<typeof useInstallments>["series"]; dimmed?: boolean }) {
  return (
    <div className={`rounded-xl border overflow-hidden overflow-x-auto${dimmed ? " opacity-50" : ""}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs font-medium">Description</TableHead>
            <TableHead className="text-xs font-medium text-right w-28">Total (AED)</TableHead>
            <TableHead className="text-xs font-medium text-right w-28">/ Month</TableHead>
            <TableHead className="text-xs font-medium w-32">Progress</TableHead>
            <TableHead className="text-xs font-medium text-right w-32">Remaining (AED)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => {
            const pct = Math.round((s.pastCount / s.totalMonths) * 100);
            return (
              <TableRow key={s.installment_id}>
                <TableCell>
                  <span className="font-medium">{s.description}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmt(s.totalAmount)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(s.monthlyAmount)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {s.pastCount}/{s.totalMonths}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.remainingCount > 0 ? (
                    <span>
                      {fmt(s.remainingAmount)}
                      <span className="text-xs text-muted-foreground ml-1">({s.remainingCount} mo)</span>
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">Done</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
