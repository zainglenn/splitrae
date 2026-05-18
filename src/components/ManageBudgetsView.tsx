"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { PageSection } from "@/components/PageSection";
import { useBudgets } from "@/hooks/useBudgets";
import { Category, CATEGORIES, CATEGORY_META } from "@/types/expense";
import { X } from "lucide-react";

interface Props {
  userId: string;
}

export function ManageBudgetsView({ userId }: Props) {
  const { budgets, setBudget, deleteBudget } = useBudgets(userId);
  const [drafts, setDrafts] = useState<Partial<Record<Category, string>>>({});

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

  return (
    <div className="space-y-5">
      <PageSection
        title="Monthly Budgets"
        description="Set monthly spending limits per category. Changes save automatically on blur. Leave blank for no limit."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const hasBudget = drafts[cat] !== undefined && drafts[cat] !== "";
            return (
              <div key={cat} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: meta.color + "20" }}
                >
                  {meta.emoji}
                </div>
                <span className="flex-1 text-sm font-medium truncate">{cat}</span>
                <div className="relative w-32 flex-shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    AED
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="—"
                    value={drafts[cat] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [cat]: e.target.value }))}
                    onBlur={() => handleBlur(cat)}
                    className="h-9 pl-10 text-sm tabular-nums pr-7"
                  />
                  {hasBudget && (
                    <button
                      type="button"
                      onClick={() => handleClear(cat)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageSection>
    </div>
  );
}
