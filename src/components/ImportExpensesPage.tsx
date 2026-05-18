"use client";

import { useState, useMemo } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulkEntryTab } from "@/components/import/BulkEntryTab";
import { ScreenshotTab } from "@/components/import/ScreenshotTab";
import { useExpenses } from "@/hooks/useExpenses";
import type { Category } from "@/types/expense";

export interface StagedExpense {
  _id: string;
  description: string;
  amount: number | "";
  category: Category;
  date: string;
  split: true;
}

interface Props {
  userId: string;
  currentMonth: string;
  onNavigateToMonth: (month: string) => void;
}

type Tab = "manual" | "screenshot";

function generateMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const start = new Date(2026, 0, 1); // January 2026
  const end = new Date();
  end.setMonth(end.getMonth() + 2); // 2 months ahead

  const cur = new Date(start);
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleDateString("en-AE", { month: "long", year: "numeric" });
    options.push({ value: key, label });
    cur.setMonth(cur.getMonth() + 1);
  }
  return options;
}

function blankRow(): StagedExpense {
  return {
    _id: crypto.randomUUID(),
    description: "",
    amount: "",
    category: "Other",
    date: new Date().toISOString().slice(0, 10),
    split: true,
  };
}

export function ImportExpensesPage({ userId, currentMonth, onNavigateToMonth }: Props) {
  const [tab, setTab] = useState<Tab>("manual");
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [manualStaged, setManualStaged] = useState<StagedExpense[]>([blankRow(), blankRow(), blankRow()]);
  const [screenshotStaged, setScreenshotStaged] = useState<StagedExpense[]>([]);
  const [adding, setAdding] = useState(false);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const { addExpense } = useExpenses(targetMonth, userId);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const staged = tab === "manual" ? manualStaged : screenshotStaged;
  const setStaged = tab === "manual" ? setManualStaged : setScreenshotStaged;

  const validRows = staged.filter(
    (r) => r.description.trim() && r.amount !== "" && Number(r.amount) > 0
  );

  async function handleAdd() {
    const rowsToAdd = staged.filter(
      (r) => r.description.trim() && r.amount !== "" && Number(r.amount) > 0
    );

    // Flag rows that have partial content but are still invalid
    const bad = new Set(
      staged
        .filter((r) => (r.description.trim() || r.amount !== "") &&
          (!r.description.trim() || r.amount === "" || Number(r.amount) <= 0))
        .map((r) => r._id)
    );
    setInvalidIds(bad);

    if (rowsToAdd.length === 0) return;

    setAdding(true);
    setSuccessCount(null);

    try {
      for (const row of rowsToAdd) {
        await addExpense({
          description: row.description.trim(),
          amount: Number(row.amount),
          category: row.category,
          date: row.date,
          split: true,
        });
      }
      const addedIds = new Set(rowsToAdd.map((r) => r._id));
      setStaged((prev) => prev.filter((r) => !addedIds.has(r._id)));
      setSuccessCount(rowsToAdd.length);
      setTimeout(() => {
        onNavigateToMonth(targetMonth);
      }, 1200);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Import Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Stage expenses here before adding them to a month.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-sm font-semibold">Add to month</CardTitle>
            <Select value={targetMonth} onValueChange={(v) => v && setTargetMonth(v)}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0 pt-4">
          {/* Tab bar */}
          <div className="flex gap-0 border-b">
            <button
              onClick={() => { setTab("manual"); setInvalidIds(new Set()); setSuccessCount(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => { setTab("screenshot"); setInvalidIds(new Set()); setSuccessCount(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === "screenshot"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Screenshot
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {tab === "manual" ? (
            <BulkEntryTab
              staged={manualStaged}
              onStagedChange={setManualStaged}
              invalidIds={invalidIds}
            />
          ) : (
            <ScreenshotTab
              staged={screenshotStaged}
              onStagedChange={setScreenshotStaged}
              invalidIds={invalidIds}
            />
          )}
        </CardContent>
      </Card>

      {/* Commit bar */}
      {staged.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 shadow-sm">
          <span className="text-sm text-muted-foreground">
            {validRows.length} of {staged.length} row{staged.length !== 1 ? "s" : ""} ready
            {invalidIds.size > 0 && (
              <span className="text-red-500 ml-2">— fix highlighted rows first</span>
            )}
          </span>

          {successCount !== null ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCheck className="h-4 w-4" />
              Added {successCount} — redirecting…
            </div>
          ) : (
            <Button
              onClick={handleAdd}
              disabled={adding || validRows.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add {validRows.length} expense{validRows.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
