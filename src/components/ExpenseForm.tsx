"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Expense, CATEGORIES, CATEGORY_META, Category } from "@/types/expense";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Expense, "id">) => void;
  initialData?: Expense | null;
  defaultDate: string;
}

export function ExpenseForm({ open, onClose, onSave, initialData, defaultDate }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Other");
  const [date, setDate] = useState(defaultDate);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(String(initialData.amount));
      setCategory(initialData.category);
      setDate(initialData.date);
    } else {
      setDescription("");
      setAmount("");
      setCategory("Other");
      setDate(defaultDate);
    }
  }, [initialData, open, defaultDate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim() || isNaN(parsed) || parsed <= 0) return;
    onSave({ description: description.trim(), amount: parsed, category, date });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {initialData ? "Edit Expense" : "New Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description
            </Label>
            <Input
              id="description"
              placeholder="e.g. Groceries at Carrefour"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
              className="h-11 text-base"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-sm font-medium text-slate-700">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                AED
              </span>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pl-14 text-base font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => {
                  const meta = CATEGORY_META[c];
                  return (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <span>{meta.emoji}</span>
                        <span>{c}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-sm font-medium text-slate-700">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">
              {initialData ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
