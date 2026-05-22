"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Budget, Category, CATEGORIES, CATEGORY_META } from "@/types/expense";

interface Props {
  open: boolean;
  onClose: () => void;
  budgets: Budget[];
  onSet: (category: Category, amount: number) => void;
  onDelete: (category: Category) => void;
}

export function ManageBudgetsDialog({ open, onClose, budgets, onSet, onDelete }: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<Category, string>>>({});

  useEffect(() => {
    if (open) {
      const initial: Partial<Record<Category, string>> = {};
      for (const b of budgets) {
        initial[b.category as Category] = String(b.amount);
      }
      setDrafts(initial);
    }
  }, [open, budgets]);

  function handleBlur(category: Category) {
    const raw = drafts[category];
    if (raw === undefined || raw === "") return;
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      onSet(category, val);
    }
  }

  function handleClear(category: Category) {
    setDrafts((d) => { const next = { ...d }; delete next[category]; return next; });
    onDelete(category);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Monthly Budgets</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1 mb-2">
          Set monthly spending limits per category. Leave blank for no limit.
        </p>

        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const hasBudget = drafts[cat] !== undefined && drafts[cat] !== "";
            return (
              <div key={cat} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: meta.color + "20" }}
                >
                  {meta.emoji}
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700 min-w-0 truncate">{cat}</span>
                <div className="relative w-32 flex-shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
