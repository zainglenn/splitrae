"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORY_META, Category } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSection } from "@/components/PageSection";
import { Sparkles, Loader2, CheckCircle2, ChevronDown, History, Clock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
  text: string;
  type: "info" | "batch" | "change" | "none" | "done" | "applied" | "error";
}

interface PendingCorrection {
  id: string;
  originalDescription: string;
  originalCategory: string;
  newDescription?: string;
  newCategory?: string;
  checked: boolean;
}

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
}

interface RunRecord {
  id: string;
  month: string;
  analyzed_at: string;
  corrections_found: number;
  corrections_applied: number;
}

// ─── Month utilities ──────────────────────────────────────────────────────────

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getAvailableMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start) {
    months.push(toMonthKey(d));
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function formatRunDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Log line component ───────────────────────────────────────────────────────

function LogLine({ entry }: { entry: LogEntry }) {
  const colors: Record<LogEntry["type"], string> = {
    info:    "text-slate-400",
    batch:   "text-sky-400 font-semibold",
    change:  "text-emerald-400",
    none:    "text-slate-600",
    done:    "text-violet-400 font-semibold",
    applied: "text-emerald-300 font-semibold",
    error:   "text-red-400",
  };
  return <div className={`${colors[entry.type]} leading-5`}>{entry.text}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

const BATCH_SIZE = 8;

export function CleanDataView({ userId }: Props) {
  const availableMonths = getAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "applying">("idle");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [corrections, setCorrections] = useState<PendingCorrection[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  async function loadHistory() {
    const { data } = await supabase
      .from("ai_advisor_runs")
      .select("id, month, analyzed_at, corrections_found, corrections_applied")
      .eq("user_id", userId)
      .order("analyzed_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as RunRecord[]);
  }

  function addLog(text: string, type: LogEntry["type"]) {
    setLog((prev) => [...prev, { text, type }]);
  }

  async function handleAnalyze() {
    setStatus("analyzing");
    setLog([]);
    setCorrections([]);
    setCurrentRunId(null);

    const label = formatMonthLabel(selectedMonth);
    addLog(`[INFO] Fetching ${label} expenses…`, "info");

    const [year, mon] = selectedMonth.split("-").map(Number);
    const from = `${selectedMonth}-01`;
    const to = new Date(year, mon, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("expenses")
      .select("id, description, category")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    if (error || !data) {
      addLog(`[ERROR] Failed to fetch expenses.`, "error");
      setStatus("done");
      return;
    }

    const rows = data as ExpenseRow[];

    if (rows.length === 0) {
      addLog(`[INFO] No expenses found for ${label}.`, "info");
      addLog(`[DONE] Nothing to analyze.`, "done");
      setStatus("done");
      return;
    }

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    addLog(`[INFO] Found ${rows.length} expense${rows.length !== 1 ? "s" : ""}. Analyzing in ${totalBatches} batch${totalBatches !== 1 ? "es" : ""} of ${BATCH_SIZE}.`, "info");

    let totalFound = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const rangeStart = i + 1;
      const rangeEnd = Math.min(i + BATCH_SIZE, rows.length);

      addLog(``, "none");
      addLog(`[BATCH ${batchNum}/${totalBatches}] Analyzing expenses ${rangeStart}–${rangeEnd}…`, "batch");

      try {
        const res = await fetch("/api/ai/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expenses: batch.map((e) => ({ id: e.id, description: e.description, category: e.category })),
          }),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const payload = await res.json() as {
          corrections: { id: string; description?: string; category?: string }[];
        };
        const batchCorrections = payload.corrections ?? [];

        const batchPending: PendingCorrection[] = [];

        for (const expense of batch) {
          const correction = batchCorrections.find((c) => c.id === expense.id);
          if (correction) {
            const parts: string[] = [];
            const newDesc = correction.description !== expense.description ? correction.description : undefined;
            const newCat = correction.category !== expense.category ? correction.category : undefined;
            if (newDesc) parts.push(`"${expense.description}" → "${newDesc}"`);
            if (newCat) parts.push(`[${expense.category}] → [${newCat}]`);
            if (parts.length > 0) {
              addLog(`  ✓ ${parts.join("  ")}`, "change");
              batchPending.push({
                id: expense.id,
                originalDescription: expense.description,
                originalCategory: expense.category,
                newDescription: newDesc,
                newCategory: newCat,
                checked: true,
              });
            } else {
              addLog(`  — ${expense.description} (no changes)`, "none");
            }
          } else {
            addLog(`  — ${expense.description} (no changes)`, "none");
          }
        }

        if (batchPending.length > 0) {
          totalFound += batchPending.length;
          setCorrections((prev) => [...prev, ...batchPending]);
        }
      } catch (err) {
        addLog(`  [ERROR] Batch ${batchNum} failed: ${err instanceof Error ? err.message : "unknown"}`, "error");
      }
    }

    addLog(``, "none");
    addLog(`[DONE] ${totalFound} correction${totalFound !== 1 ? "s" : ""} found across ${rows.length} expenses.`, "done");

    // Insert run record
    const { data: runData } = await supabase
      .from("ai_advisor_runs")
      .insert({ user_id: userId, month: selectedMonth, corrections_found: totalFound })
      .select("id")
      .single();
    if (runData) setCurrentRunId(runData.id);

    await loadHistory();
    setStatus("done");
  }

  function toggleCorrection(id: string) {
    setCorrections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  }

  function toggleAll(checked: boolean) {
    setCorrections((prev) => prev.map((c) => ({ ...c, checked })));
  }

  async function handleApply() {
    const selected = corrections.filter((c) => c.checked);
    if (selected.length === 0) return;

    setStatus("applying");
    addLog(``, "none");
    addLog(`[INFO] Applying ${selected.length} change${selected.length !== 1 ? "s" : ""}…`, "info");

    let applied = 0;
    for (const correction of selected) {
      const updates: Record<string, string> = {};
      if (correction.newDescription) updates.description = correction.newDescription;
      if (correction.newCategory) updates.category = correction.newCategory;

      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", correction.id)
        .eq("user_id", userId);

      if (!error) applied++;
    }

    addLog(`[APPLIED] ${applied} change${applied !== 1 ? "s" : ""} saved to database.`, "applied");

    // Update run record with applied count
    if (currentRunId) {
      const existing = history.find((r) => r.id === currentRunId);
      const prevApplied = existing?.corrections_applied ?? 0;
      await supabase
        .from("ai_advisor_runs")
        .update({ corrections_applied: prevApplied + applied })
        .eq("id", currentRunId);
      await loadHistory();
    }

    setCorrections((prev) => prev.filter((c) => !c.checked));
    setStatus("done");
  }

  const checkedCount = corrections.filter((c) => c.checked).length;
  const allChecked = corrections.length > 0 && checkedCount === corrections.length;

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          Select a month, analyze with AI, then apply corrections.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={status === "analyzing" || status === "applying"}
              className="h-9 pl-3 pr-8 rounded-md border bg-background text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={status === "analyzing" || status === "applying"}
            size="sm"
          >
            {status === "analyzing" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Analyzing…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyze</>
            )}
          </Button>
        </div>
      </div>

      {/* Processing log */}
      {log.length > 0 && (
        <PageSection title="Processing Log">
          <div
            ref={logRef}
            className="bg-slate-900 rounded-lg p-4 font-mono text-xs leading-5 max-h-72 overflow-y-auto"
          >
            {log.map((entry, i) => (
              <LogLine key={i} entry={entry} />
            ))}
            {status === "analyzing" && (
              <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing…</span>
              </div>
            )}
          </div>
        </PageSection>
      )}

      {/* Corrections list */}
      {corrections.length > 0 && (
        <PageSection
          title="Proposed Changes"
          description={`${checkedCount} of ${corrections.length} selected`}
        >
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => toggleAll(!allChecked)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allChecked ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="space-y-1.5">
              {corrections.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    c.checked ? "bg-muted/50 border-border" : "bg-background border-border/40 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={() => toggleCorrection(c.id)}
                    className="mt-0.5 h-4 w-4 rounded accent-violet-600 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    {c.newDescription && (
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-muted-foreground line-through truncate max-w-[200px]">{c.originalDescription}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium truncate max-w-[200px]">{c.newDescription}</span>
                      </div>
                    )}
                    {c.newCategory && (
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-muted-foreground">
                          {!c.newDescription && (
                            <span className="font-medium text-foreground text-sm mr-1">{c.originalDescription}</span>
                          )}
                          Category:
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 line-through opacity-60"
                          style={{ borderColor: CATEGORY_META[c.originalCategory as Category]?.color + "60", color: CATEGORY_META[c.originalCategory as Category]?.color }}
                        >
                          {CATEGORY_META[c.originalCategory as Category]?.emoji} {c.originalCategory}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{ borderColor: CATEGORY_META[c.newCategory as Category]?.color, color: CATEGORY_META[c.newCategory as Category]?.color }}
                        >
                          {CATEGORY_META[c.newCategory as Category]?.emoji} {c.newCategory}
                        </Badge>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleApply}
                disabled={checkedCount === 0 || status === "applying" || status === "analyzing"}
                className="gap-1.5"
              >
                {status === "applying" ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Applying…</>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5" />Apply {checkedCount} Selected Change{checkedCount !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </div>
        </PageSection>
      )}

      {/* Empty state after analysis */}
      {status === "done" && corrections.length === 0 && log.length > 0 && (
        <PageSection>
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">All clean!</p>
            <p className="text-xs">No corrections needed for this month.</p>
          </div>
        </PageSection>
      )}

      {/* Run history */}
      {history.length > 0 && (
        <PageSection
          title="History"
          description="Past AI Advisor sessions"
        >
          <div className="space-y-1.5">
            {history.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm"
              >
                <History className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{formatMonthLabel(run.month)}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{formatRunDate(run.analyzed_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{run.corrections_found}</span> found
                  </span>
                  {run.corrections_applied > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      <span className="font-medium">{run.corrections_applied}</span> applied
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
