"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/types/expense";
import type { StagedExpense } from "@/components/ImportExpensesPage";

interface Props {
  rows: StagedExpense[];
  onChange: (rows: StagedExpense[]) => void;
  invalidIds?: Set<string>;
}

export function StagingTable({ rows, onChange, invalidIds }: Props) {
  const categorizingRef = useRef<Set<string>>(new Set());
  // Keep a live ref so async callbacks always see the latest rows
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  function update(id: string, patch: Partial<StagedExpense>) {
    onChange(rows.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function remove(id: string) {
    onChange(rows.filter((r) => r._id !== id));
  }

  async function handleDescriptionBlur(row: StagedExpense) {
    if (!row.description.trim() || row.category !== "Other") return;
    if (categorizingRef.current.has(row._id)) return;
    categorizingRef.current.add(row._id);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: row.description }),
      });
      if (res.ok) {
        const { category } = await res.json();
        // Only apply if still "Other" (user may have changed it while waiting)
        onChange(
          rowsRef.current.map((r) =>
            r._id === row._id && r.category === "Other" ? { ...r, category } : r
          )
        );
      }
    } finally {
      categorizingRef.current.delete(row._id);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No expenses staged yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left font-medium pb-2 pr-2 w-36">Date</th>
            <th className="text-left font-medium pb-2 pr-2">Description</th>
            <th className="text-left font-medium pb-2 pr-2 w-32">Amount (AED)</th>
            <th className="text-left font-medium pb-2 pr-2 w-40">Category</th>
            <th className="text-left font-medium pb-2 pr-2 w-24">Installment</th>
            <th className="w-8 pb-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row) => {
            const invalid = invalidIds?.has(row._id);
            return (
              <tr key={row._id} className={invalid ? "bg-red-50" : undefined}>
                <td className="py-1.5 pr-2">
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(e) => update(row._id, { date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    value={row.description}
                    placeholder="Description"
                    onChange={(e) => update(row._id, { description: e.target.value })}
                    onBlur={() => handleDescriptionBlur(row)}
                    className={`h-8 text-xs ${invalid && !row.description.trim() ? "border-red-400" : ""}`}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={row.amount === "" ? "" : row.amount}
                    placeholder="0.00"
                    onChange={(e) =>
                      update(row._id, {
                        amount: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    className={`h-8 text-xs ${invalid && (row.amount === "" || Number(row.amount) <= 0) ? "border-red-400" : ""}`}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Select
                    value={row.category}
                    onValueChange={(v) => update(row._id, { category: v as StagedExpense["category"] })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1.5 pr-2">
                  <Select
                    value={String(row.installmentMonths ?? 1)}
                    onValueChange={(v) => update(row._id, { installmentMonths: Number(v) as StagedExpense["installmentMonths"] })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">None</SelectItem>
                      <SelectItem value="4" className="text-xs">4 mo</SelectItem>
                      <SelectItem value="8" className="text-xs">8 mo</SelectItem>
                      <SelectItem value="12" className="text-xs">12 mo</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => remove(row._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
