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
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 flex-1 text-base"
          />
          <Select value={splitFilter} onValueChange={(v) => setSplitFilter(v as typeof splitFilter)}>
            <SelectTrigger className="h-10 w-32 shrink-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="split">Split</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterCategory || search || splitFilter !== "all") && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterCategory && (
              <button
                onClick={onClearCategoryFilter}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border transition-colors"
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
                className="h-8 text-muted-foreground"
                onClick={() => { setSearch(""); setSplitFilter("all"); }}
              >
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {filtered.length} of {expenses.length}
            </span>
          </div>
        )}
        {!filterCategory && search === "" && splitFilter === "all" && (
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {filtered.length} transactions
          </p>
        )}
      </div>

      {/* Table — scrollable on mobile */}
      <div className="rounded-xl border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead
                className="w-[80px] cursor-pointer select-none"
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
                className="w-[130px] cursor-pointer select-none hidden sm:table-cell"
                onClick={() => toggleSort("category")}
              >
                <div className="flex items-center gap-1">
                  Category <SortIcon col="category" active={sortKey === "category"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead
                className="w-[100px] text-right cursor-pointer select-none"
                onClick={() => toggleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount <SortIcon col="amount" active={sortKey === "amount"} dir={sortDir} />
                </div>
              </TableHead>
              <TableHead className="w-[72px]" />
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
                  <TableRow key={expense.id}>
                    <TableCell className="text-xs text-slate-500 tabular-nums whitespace-nowrap align-top pt-3">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-slate-800 truncate text-sm">{expense.description}</span>
                          {expense.split && (
                            <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600">
                              split
                            </span>
                          )}
                        </div>
                        {/* Category shown inline on mobile */}
                        <span
                          className="sm:hidden inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md w-fit"
                          style={{ backgroundColor: meta.color + "18", color: meta.color }}
                        >
                          {meta.emoji} {expense.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell align-top pt-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap"
                        style={{ backgroundColor: meta.color + "18", color: meta.color }}
                      >
                        {meta.emoji} {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-slate-800 whitespace-nowrap align-top pt-3">
                      {fmt.format(expense.amount)}
                    </TableCell>
                    <TableCell className="align-top pt-1">
                      <div className="flex gap-0.5 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-accent"
                          onClick={() => onEdit(expense)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => onDelete(expense.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
