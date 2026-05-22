"use client";

import { Loader2 } from "lucide-react";
import { useInstallments } from "@/hooks/useInstallments";
import { PageContainer } from "@/components/PageContainer";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        <CollapsibleCard title={`Active (${active.length})`} noPadding>
          <SeriesTable rows={active} />
        </CollapsibleCard>
      )}

      {completed.length > 0 && (
        <CollapsibleCard title={`Completed (${completed.length})`} defaultOpen={false} noPadding>
          <SeriesTable rows={completed} dimmed />
        </CollapsibleCard>
      )}
    </PageContainer>
  );
}

function SeriesTable({ rows, dimmed }: { rows: ReturnType<typeof useInstallments>["series"]; dimmed?: boolean }) {
  return (
    <div className={`overflow-x-auto ${dimmed ? "opacity-50" : ""}`}>
      <Table>
        <TableHeader>
          <TableRow className="">
            <TableHead>Description</TableHead>
            <TableHead className="text-right w-[120px]">Total (AED)</TableHead>
            <TableHead className="text-right w-[110px]">/ Month</TableHead>
            <TableHead className="w-[160px] hidden sm:table-cell">Progress</TableHead>
            <TableHead className="text-right w-[140px]">Remaining (AED)</TableHead>
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
                <TableCell className="hidden sm:table-cell">
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
