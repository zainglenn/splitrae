"use client";

import { useState, useMemo, useEffect } from "react";
import { CheckCheck, Loader2, Sparkles, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BulkEntryTab } from "@/components/import/BulkEntryTab";
import { ScreenshotTab } from "@/components/import/ScreenshotTab";
import { PageContainer } from "@/components/PageContainer";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/expense";

interface AuditSuggestion {
  rowId: string;
  description?: string;
  category?: Category;
  fromDescription?: string;
  fromCategory?: string;
}

export interface StagedExpense {
  _id: string;
  description: string;
  amount: number | "";
  category: Category;
  date: string;
  installmentMonths: 1 | 4 | 8 | 12;
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
    installmentMonths: 1,
  };
}

export function ImportExpensesPage({ userId, currentMonth, onNavigateToMonth }: Props) {
  const [tab, setTab] = useState<Tab>("manual");
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  // Empty on server; populated client-side to avoid SSR hydration mismatch
  // (crypto.randomUUID and new Date() differ between server and client)
  const [manualStaged, setManualStaged] = useState<StagedExpense[]>([]);

  useEffect(() => {
    setManualStaged([blankRow(), blankRow(), blankRow()]);
  }, []);
  const [screenshotStaged, setScreenshotStaged] = useState<StagedExpense[]>([]);
  const [adding, setAdding] = useState(false);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [suggestions, setSuggestions] = useState<AuditSuggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.rowId));

  async function runAudit() {
    const rows = staged.filter((r) => r.description.trim());
    if (rows.length === 0) return;
    setAuditing(true);
    setSuggestions([]);
    setDismissedIds(new Set());
    try {
      const res = await fetch("/api/ai/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: rows.map((r) => ({ id: r._id, description: r.description, category: r.category })),
        }),
      });
      if (!res.ok) return;
      const { corrections } = await res.json() as { corrections: { id: string; description?: string; category?: string }[] };
      const built: AuditSuggestion[] = corrections.map((c) => {
        const row = rows.find((r) => r._id === c.id)!;
        return {
          rowId: c.id,
          ...(c.description ? { description: c.description, fromDescription: row.description } : {}),
          ...(c.category ? { category: c.category as Category, fromCategory: row.category } : {}),
        };
      });
      setSuggestions(built);
    } finally {
      setAuditing(false);
    }
  }

  function acceptSuggestion(s: AuditSuggestion) {
    const patch: Partial<StagedExpense> = {};
    if (s.description) patch.description = s.description;
    if (s.category) patch.category = s.category;
    setStaged((prev) => prev.map((r) => r._id === s.rowId ? { ...r, ...patch } : r));
    setDismissedIds((prev) => new Set([...prev, s.rowId]));
  }

  function acceptAllSuggestions() {
    setStaged((prev) =>
      prev.map((r) => {
        const s = activeSuggestions.find((s) => s.rowId === r._id);
        if (!s) return r;
        return {
          ...r,
          ...(s.description ? { description: s.description } : {}),
          ...(s.category ? { category: s.category } : {}),
        };
      })
    );
    setDismissedIds((prev) => new Set([...prev, ...activeSuggestions.map((s) => s.rowId)]));
  }

  async function insertExpense(expense: {
    description: string; amount: number; category: Category; date: string;
    installment_id?: string; installment_index?: number; installment_total?: number;
  }) {
    await supabase.from("expenses").insert({ ...expense, user_id: userId, id: crypto.randomUUID() });
  }

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const staged = tab === "manual" ? manualStaged : screenshotStaged;
  const setStaged = tab === "manual" ? setManualStaged : setScreenshotStaged;

  const validRows = staged.filter(
    (r) => r.description.trim() && r.amount !== "" && Number(r.amount) > 0
  );

  function handleAdd() {
    const bad = new Set(
      staged
        .filter((r) => (r.description.trim() || r.amount !== "") &&
          (!r.description.trim() || r.amount === "" || Number(r.amount) <= 0))
        .map((r) => r._id)
    );
    setInvalidIds(bad);
    if (validRows.length === 0) return;
    setConfirmOpen(true);
  }

  async function executeAdd() {
    const rowsToAdd = validRows;

    setAdding(true);
    setSuccessCount(null);

    try {
      for (const row of rowsToAdd) {
        const months = row.installmentMonths ?? 1;
        const amount = Number(row.amount);
        if (months > 1) {
          const seriesId = crypto.randomUUID();
          const base = Math.floor((amount / months) * 100) / 100;
          const remainder = Math.round((amount - base * months) * 100) / 100;
          const [y, m] = row.date.split("-").map(Number);
          for (let i = 0; i < months; i++) {
            const target = new Date(y, m - 1 + i, 1);
            const date = i === 0
              ? row.date
              : `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`;
            await insertExpense({
              description: row.description.trim(),
              amount: i === months - 1 ? base + remainder : base,
              category: row.category,
              date,
              installment_id: seriesId,
              installment_index: i + 1,
              installment_total: months,
            });
          }
        } else {
          await insertExpense({
            description: row.description.trim(),
            amount,
            category: row.category,
            date: row.date,
          });
        }
      }
      const addedIds = new Set(rowsToAdd.map((r) => r._id));
      setStaged((prev) => prev.filter((r) => !addedIds.has(r._id)));
      setSuccessCount(rowsToAdd.length);
      setConfirmOpen(false);
      setSuggestions([]);
      setDismissedIds(new Set());
      setTimeout(() => {
        onNavigateToMonth(targetMonth);
      }, 1200);
    } finally {
      setAdding(false);
    }
  }

  return (
    <PageContainer>

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

      {/* AI audit suggestions panel */}
      {activeSuggestions.length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-violet-800">
              <Sparkles className="h-4 w-4" />
              {activeSuggestions.length} suggestion{activeSuggestions.length !== 1 ? "s" : ""} from AI review
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-100" onClick={acceptAllSuggestions}>
              Accept all
            </Button>
          </div>
          <div className="space-y-2">
            {activeSuggestions.map((s) => (
              <div key={s.rowId} className="flex items-start justify-between gap-3 bg-white rounded-md px-3 py-2 border border-violet-100">
                <div className="text-xs space-y-0.5 min-w-0">
                  {s.fromDescription && s.description && (
                    <p className="text-slate-600">
                      <span className="line-through text-slate-400 mr-1">{s.fromDescription}</span>→ <span className="font-medium text-slate-800">{s.description}</span>
                    </p>
                  )}
                  {s.fromCategory && s.category && (
                    <p className="text-slate-500">
                      Category: <span className="line-through text-slate-400 mr-1">{s.fromCategory}</span>→ <span className="font-medium text-slate-700">{s.category}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => acceptSuggestion(s)} className="text-violet-600 hover:text-violet-800 p-0.5" title="Accept">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDismissedIds((prev) => new Set([...prev, s.rowId]))} className="text-slate-400 hover:text-slate-600 p-0.5" title="Dismiss">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-violet-700 border-violet-200 hover:bg-violet-50"
                onClick={runAudit}
                disabled={auditing || staged.filter((r) => r.description.trim()).length === 0}
              >
                {auditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Review
              </Button>
            <Button
              onClick={handleAdd}
              disabled={adding || validRows.length === 0}
              size="sm"
              className="gap-1.5"
            >
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add {validRows.length} expense{validRows.length !== 1 ? "s" : ""}
            </Button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm {validRows.length} expense{validRows.length !== 1 ? "s" : ""}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Adding to <span className="font-medium">{monthOptions.find((o) => o.value === targetMonth)?.label}</span>
            </p>
          </DialogHeader>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-popover">
                <tr className="border-b text-muted-foreground">
                  <th className="text-left font-medium pb-2 pr-3 w-28">Date</th>
                  <th className="text-left font-medium pb-2 pr-3">Description</th>
                  <th className="text-right font-medium pb-2 pr-3 w-24">Amount</th>
                  <th className="text-left font-medium pb-2 pr-3 w-28">Category</th>
                  <th className="text-left font-medium pb-2 w-24">Installment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {validRows.map((row) => (
                  <tr key={row._id}>
                    <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{row.date}</td>
                    <td className="py-1.5 pr-3 font-medium">{row.description.trim()}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {Number(row.amount).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{row.category}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {(row.installmentMonths ?? 1) > 1 ? `${row.installmentMonths} months` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button size="sm" onClick={executeAdd} disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm & add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
