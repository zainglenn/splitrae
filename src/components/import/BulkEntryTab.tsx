"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StagingTable } from "@/components/import/StagingTable";
import type { StagedExpense } from "@/components/ImportExpensesPage";

interface Props {
  staged: StagedExpense[];
  onStagedChange: (rows: StagedExpense[]) => void;
  invalidIds?: Set<string>;
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

function parsePastedText(text: string, defaultDate: string): StagedExpense[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,/).map((p) => p.trim().replace(/^"|"$/g, ""));
      const description = parts[0] ?? "";
      const parsed = parseFloat(parts[1] ?? "");
      const amount: number | "" = isNaN(parsed) ? "" : parsed;
      return {
        _id: crypto.randomUUID(),
        description,
        amount,
        category: "Other" as const,
        date: defaultDate,
        split: true as const,
      };
    })
    .filter((r) => r.description);
}

export function BulkEntryTab({ staged, onStagedChange, invalidIds }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  function addRow() {
    onStagedChange([...staged, blankRow()]);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text");
    const lines = text.trim().split("\n").filter(Boolean);
    // Only treat as bulk paste if it looks like multiple lines or tab/comma separated
    if (lines.length < 2 && !text.includes("\t")) return;
    e.preventDefault();
    const parsed = parsePastedText(text, today);
    if (parsed.length > 0) {
      onStagedChange([...staged, ...parsed]);
    }
  }

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      <StagingTable rows={staged} onChange={onStagedChange} invalidIds={invalidIds} />
      <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add row
      </Button>
      <p className="text-xs text-muted-foreground">
        Tip: paste tab- or comma-separated rows (description, amount) to bulk-import lines.
      </p>
    </div>
  );
}
