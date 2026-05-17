"use client";

import { useState, useMemo } from "react";
import { Expense, CATEGORY_META, Category } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Receipt, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";

interface Props {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  filterCategory?: Category | null;
  onClearCategoryFilter?: () => void;
}

type SortKey = "date" | "description" | "amount" | "category";
type SortDir = "asc" | "desc";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
  });
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5" />
    : <ArrowDown className="h-3.5 w-3.5" />;
}

export function ExpenseList({ expenses, onEdit, onDelete, filterCategory, onClearCategoryFilter }: Props) {
  const [search, setSearch] = useState("");
  const [splitFilter, setSplitFilter] = useState<"all" | "split" | "personal">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCategory) list = list.filter((e) => e.category === filterCategory);
    if (splitFilter === "split") list = list.filter((e) => e.split);
    if (splitFilter === "personal") list = list.filter((e) => !e.split);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.description.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "description") cmp = a.description.localeCompare(b.description);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [expenses, filterCategory, splitFilter, search, sortKey, sortDir]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Receipt className="h-7 w-7 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-500">No expenses yet</p>
          <p className="text-sm mt-0.5">Tap <strong className="text-primary">Add</strong> to record your first expense.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-48 text-sm"
        />
        <Select value={splitFilter} onValueChange={(v) => setSplitFilter(v as typeof splitFilter)}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All expenses</SelectItem>
            <SelectItem value="split">Split only</SelectItem>
            <SelectItem value="personal">Personal only</SelectItem>
          </SelectContent>
        </Select>
        {filterCategory && (
          <button
            onClick={onClearCategoryFilter}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border transition-colors hover:bg-slate-50"
            style={{
              borderColor: CATEGORY_META[filterCategory].color + "60",
              color: CATEGORY_META[filterCategory].color,
              backgroundColor: CATEGORY_META[filterCategory].color + "10",
            }}
          >
            {CATEGORY_META[filterCategory].emoji} {filterCategory}
            <X className="h-3.5 w-3.5 opacity-60" />
          </button>
        )}
        {(search || splitFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setSplitFilter("all"); }}
          >
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} of {expenses.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead
                className="w-[90px] cursor-pointer select-none"
                onClick={() => toggleSort("date")}
              >
                <div className="flex items-center gap-1">
                  Date <SortIcon col="date" active={sortKey === "date"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("description")}
              >
                <div className="flex items-center gap-1">
                  Description <SortIcon col="description" active={sortKey === "description"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead
                className="w-[130px] cursor-pointer select-none"
                onClick={() => toggleSort("category")}
              >
                <div className="flex items-center gap-1">
                  Category <SortIcon col="category" active={sortKey === "category"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead
                className="w-[110px] text-right cursor-pointer select-none"
                onClick={() => toggleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount <SortIcon col="amount" active={sortKey === "amount"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                  No transactions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((expense) => {
                const meta = CATEGORY_META[expense.category];
                return (
                  <TableRow key={expense.id} className="group">
                    <TableCell className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-slate-800 truncate">{expense.description}</span>
                        {expense.split && (
                          <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                            split
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap"
                        style={{ backgroundColor: meta.color + "18", color: meta.color }}
                      >
                        {meta.emoji} {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-slate-800 whitespace-nowrap">
                      {fmt.format(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-accent"
                          onClick={() => onEdit(expense)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => onDelete(expense.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
