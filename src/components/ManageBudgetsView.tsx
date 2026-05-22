"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/PageSection";
import { PageContainer } from "@/components/PageContainer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBudgets } from "@/hooks/useBudgets";
import { supabase } from "@/lib/supabase";
import { Category, CATEGORIES, CATEGORY_META } from "@/types/expense";
import { X, Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  userId: string;
  month?: string;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ManageBudgetsView({ userId, month = "" }: Props) {
  const { budgets, setBudget, deleteBudget } = useBudgets(userId, month);
  const [drafts, setDrafts] = useState<Partial<Record<Category, string>>>({});
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Partial<Record<Category, number>> | null>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<Category>>(new Set());
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    const initial: Partial<Record<Category, string>> = {};
    for (const b of budgets) {
      initial[b.category as Category] = String(b.amount);
    }
    setDrafts(initial);
  }, [budgets]);

  function handleBlur(category: Category) {
    const raw = drafts[category];
    if (raw === undefined || raw === "") return;
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      setBudget(category, val);
    }
  }

  function handleClear(category: Category) {
    setDrafts((d) => { const next = { ...d }; delete next[category]; return next; });
    deleteBudget(category);
  }

  async function handleGenerate() {
    setGenerating(true);
    setSuggestions(null);

    // Fetch last 3 months of expenses
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startDate = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const { data } = await supabase
      .from("expenses")
      .select("date, amount, category")
      .eq("user_id", userId)
      .gte("date", startDate);

    if (!data || data.length === 0) {
      setGenerating(false);
      return;
    }

    // Aggregate into monthly totals per category
    const monthlyTotals: Record<string, Record<string, number>> = {};
    for (const e of data) {
      const month = e.date.slice(0, 7);
      if (!monthlyTotals[month]) monthlyTotals[month] = {};
      monthlyTotals[month][e.category] = (monthlyTotals[month][e.category] ?? 0) + e.amount;
    }

    try {
      const res = await fetch("/api/ai/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyTotals }),
      });

      if (!res.ok) { setGenerating(false); return; }

      const json = await res.json();
      const suggested = json.budgets as Partial<Record<Category, number>>;

      setSuggestions(suggested);
      setCheckedSuggestions(new Set(Object.keys(suggested) as Category[]));
      setShowSuggestions(true);
    } catch {
      // silently ignore
    }

    setGenerating(false);
  }

  async function handleApply() {
    if (!suggestions) return;
    setApplying(true);
    for (const [cat, amount] of Object.entries(suggestions)) {
      if (checkedSuggestions.has(cat as Category) && amount) {
        await setBudget(cat as Category, amount);
      }
    }
    setApplying(false);
    setSuggestions(null);
    setSuccessMsg(`${checkedSuggestions.size} budgets applied.`);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function toggleSuggestion(cat: Category) {
    setCheckedSuggestions((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const suggestedCategories = suggestions ? (Object.keys(suggestions) as Category[]) : [];

  return (
    <PageContainer>
      {/* AI suggestion panel */}
      <PageSection
        title="AI Budget Generator"
        description="Analyses your last 3 months of spending to suggest realistic monthly budgets per category."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              size="sm"
            >
              {generating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />
              }
              {generating ? "Analysing…" : "Generate Budgets"}
            </Button>
            {successMsg && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {successMsg}
              </span>
            )}
          </div>

          {suggestions && suggestedCategories.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b cursor-pointer select-none"
                onClick={() => setShowSuggestions((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-sm font-medium text-violet-700">
                    {suggestedCategories.length} suggestions — {checkedSuggestions.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-violet-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      checkedSuggestions.size === suggestedCategories.length
                        ? setCheckedSuggestions(new Set())
                        : setCheckedSuggestions(new Set(suggestedCategories));
                    }}
                  >
                    {checkedSuggestions.size === suggestedCategories.length ? "Deselect all" : "Select all"}
                  </button>
                  {showSuggestions ? <ChevronUp className="h-4 w-4 text-violet-400" /> : <ChevronDown className="h-4 w-4 text-violet-400" />}
                </div>
              </div>

              {showSuggestions && (
                <div className="divide-y">
                  {suggestedCategories.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const existing = drafts[cat];
                    const suggested = suggestions[cat]!;
                    const isChecked = checkedSuggestions.has(cat);

                    return (
                      <label
                        key={cat}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isChecked ? "bg-white" : "bg-muted/30"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSuggestion(cat)}
                          className="h-4 w-4 rounded accent-violet-600"
                        />
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: meta.color + "20" }}
                        >
                          {meta.emoji}
                        </div>
                        <span className="flex-1 text-sm font-medium">{cat}</span>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold tabular-nums text-slate-800">{fmt.format(suggested)}</span>
                          {existing && Number(existing) !== suggested && (
                            <p className="text-[10px] text-muted-foreground">
                              was {fmt.format(Number(existing))}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Apply footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/20 border-t">
                <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)}>
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={applying || checkedSuggestions.size === 0}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                >
                  {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Apply {checkedSuggestions.size > 0 ? checkedSuggestions.size : ""} Budget{checkedSuggestions.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {suggestions && suggestedCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">No suggestions — not enough historical data yet.</p>
          )}
        </div>
      </PageSection>

      {/* Manual budgets */}
      <PageSection
        title="Monthly Budgets"
        description="Set or override monthly spending limits per category. Changes save automatically."
      >
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead>Category</TableHead>
                <TableHead className="text-right w-[180px]">Monthly Budget</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const hasBudget = drafts[cat] !== undefined && drafts[cat] !== "";
                return (
                  <TableRow key={cat}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: meta.color + "20" }}>
                          {meta.emoji}
                        </div>
                        <span className="text-sm font-medium">{cat}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-2.5 text-xs font-semibold text-muted-foreground pointer-events-none">AED</span>
                        <Input
                          type="number" min="1" step="1" placeholder="—"
                          value={drafts[cat] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [cat]: e.target.value }))}
                          onBlur={() => handleBlur(cat)}
                          className="h-8 pl-10 pr-2 text-sm tabular-nums w-36 text-right"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasBudget && (
                        <button type="button" onClick={() => handleClear(cat)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </PageSection>
    </PageContainer>
  );
}
