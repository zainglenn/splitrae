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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Receipt, ArrowUpDown, ArrowUp, ArrowDown, X, RefreshCw, Layers } from "lucide-react";

interface Props {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string, installmentId?: string | null) => void;
  onConvertToInstallments?: (expense: Expense, months: number, monthlyAmount: number, startDate: string) => void;
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

const PAGE_SIZE = 10;

export function ExpenseList({ expenses, onEdit, onDelete, onConvertToInstallments, filterCategory, onClearCategoryFilter }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [convertTarget, setConvertTarget] = useState<Expense | null>(null);
  const [convMonths, setConvMonths] = useState("3");
  const [convAmount, setConvAmount] = useState("");
  const [convStart, setConvStart] = useState("");
  const [converting, setConverting] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCategory) list = list.filter((e) => e.category === filterCategory);
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
  }, [expenses, filterCategory, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 text-base flex-1"
          />
        </div>
        {(filterCategory || search) && (
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
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => setSearch("")}
              >
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {filtered.length} of {expenses.length}
            </span>
          </div>
        )}
        {!filterCategory && search === "" && (
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Table — scrollable on mobile */}
      <div className="rounded-xl border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="">
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
              paginated.map((expense) => {
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
                          {expense.is_recurring && (
                            <span title="Recurring monthly">
                              <RefreshCw className="h-3 w-3 flex-shrink-0 text-violet-500" />
                            </span>
                          )}
                          {expense.installment_index != null && expense.installment_total != null && (
                            <span
                              className="inline-flex items-center text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 shrink-0"
                              title={`Installment ${expense.installment_index} of ${expense.installment_total}`}
                            >
                              {expense.installment_index}/{expense.installment_total}
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
                    {(onEdit || onDelete || onConvertToInstallments) && (
                      <TableCell className="align-top pt-1">
                        <div className="flex gap-0.5 justify-end">
                          {onConvertToInstallments && !expense.installment_id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setConvertTarget(expense);
                                setConvAmount(String(expense.amount));
                                setConvStart(expense.date);
                                setConvMonths("3");
                              }}
                              aria-label="Convert to installments"
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-accent"
                              onClick={() => onEdit(expense)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => onDelete(expense.id, expense.installment_id)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="h-8 px-3 text-xs"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="h-8 px-3 text-xs"
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!convertTarget} onOpenChange={(open) => { if (!open) setConvertTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Installments</DialogTitle>
          </DialogHeader>
          {convertTarget && (
            <div className="space-y-4 py-1">
              <p className="text-sm text-muted-foreground truncate">
                <span className="font-medium text-foreground">{convertTarget.description}</span>
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Monthly Amount (AED)</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={convAmount}
                  onChange={(e) => setConvAmount(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Number of Months</label>
                <Input
                  type="number"
                  min="2"
                  max="60"
                  step="1"
                  value={convMonths}
                  onChange={(e) => setConvMonths(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={convStart}
                  onChange={(e) => setConvStart(e.target.value)}
                  className="h-10"
                />
              </div>
              {convAmount && convMonths && (
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(
                      parseFloat(convAmount) * parseInt(convMonths)
                    )}
                  </span> over {convMonths} months
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertTarget(null)}
              disabled={converting}
            >
              Cancel
            </Button>
            <Button
              disabled={converting || !convAmount || !convMonths || !convStart || parseInt(convMonths) < 2}
              onClick={async () => {
                if (!convertTarget || !onConvertToInstallments) return;
                setConverting(true);
                await onConvertToInstallments(
                  convertTarget,
                  parseInt(convMonths),
                  parseFloat(convAmount),
                  convStart,
                );
                setConverting(false);
                setConvertTarget(null);
              }}
            >
              {converting ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
