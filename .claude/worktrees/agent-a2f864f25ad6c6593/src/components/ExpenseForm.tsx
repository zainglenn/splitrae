"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Loader2 } from "lucide-react";
import { Expense, CATEGORIES, CATEGORY_META, Category } from "@/types/expense";
import { Switch } from "@/components/ui/switch";

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<Category | null>(null);
  const userChangedCategoryRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(String(initialData.amount));
      setCategory(initialData.category);
      setDate(initialData.date);
      setIsRecurring(initialData.is_recurring ?? false);
      userChangedCategoryRef.current = true; // don't override in edit mode
    } else {
      setDescription("");
      setAmount("");
      setCategory("Other");
      setDate(defaultDate);
      setIsRecurring(false);
      userChangedCategoryRef.current = false;
    }
    setAiSuggested(null);
    setAiLoading(false);
  }, [initialData, open, defaultDate]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const fetchAiCategory = useCallback(async (desc: string) => {
    if (!desc.trim() || desc.trim().length < 3) return;
    setAiLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc.trim() }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.category) {
        setAiSuggested(data.category as Category);
        if (!userChangedCategoryRef.current) {
          setCategory(data.category as Category);
        }
      }
    } catch {
      // Silently ignore timeout or network failure
    } finally {
      clearTimeout(timeout);
      setAiLoading(false);
    }
  }, []);

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAiCategory(value);
    }, 600);
  }

  function handleDescriptionBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchAiCategory(description);
  }

  function handleCategoryChange(v: string | null) {
    if (!v) return;
    setCategory(v as Category);
    userChangedCategoryRef.current = true;
    setAiSuggested(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!description.trim() || isNaN(parsed) || parsed <= 0) return;
    onSave({ description: description.trim(), amount: parsed, category, date, split: true, is_recurring: isRecurring });
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
            <div className="relative">
              <Input
                id="description"
                placeholder="e.g. Groceries at Carrefour"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                onBlur={handleDescriptionBlur}
                autoFocus
                className="h-11 text-base pr-9"
              />
              {aiLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
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
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-slate-700">Category</Label>
              {aiSuggested && !userChangedCategoryRef.current && (
                <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-md">
                  ✨ suggested
                </span>
              )}
            </div>
            <Select value={category} onValueChange={handleCategoryChange}>
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

          {/* Recurring toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-slate-700 cursor-pointer">
                🔁 Recurring monthly
              </Label>
              <p className="text-xs text-muted-foreground">Auto-suggest this expense each month</p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
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
