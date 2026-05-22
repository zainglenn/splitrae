"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; date: string; note: string }) => void;
  payerName: string;
  payerColor: string;
  defaultDate: string;
  remaining: number;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function RecordPaymentDialog({ open, onClose, onSave, payerName, payerColor, defaultDate, remaining }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(remaining > 0 ? remaining.toFixed(2) : "");
      setDate(defaultDate);
      setNote("");
    }
  }, [open, remaining, defaultDate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    onSave({ amount: parsed, date, note: note.trim() });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Record Payment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
              style={{ backgroundColor: payerColor }}
            />
            {payerName} · balance due {fmt.format(remaining)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount" className="text-sm font-medium">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                AED
              </span>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="h-11 pl-14 text-base font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date" className="text-sm font-medium">Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-note" className="text-sm font-medium">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="pay-note"
              placeholder="e.g. Bank transfer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none">
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
