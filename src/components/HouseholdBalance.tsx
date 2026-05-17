"use client";

import { useState } from "react";
import { Expense } from "@/types/expense";
import { Payer, Payment } from "@/types/payer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, ChevronUp, Trash2, Plus, Users } from "lucide-react";

interface Props {
  expenses: Expense[];
  payers: Payer[];
  payments: Payment[];
  month: string;
  defaultDate: string;
  onRecordPayment: (payerId: string) => void;
  onDeletePayment: (id: string) => void;
  onManagePayers: () => void;
}

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

export function HouseholdBalance({
  expenses,
  payers,
  payments,
  onRecordPayment,
  onDeletePayment,
  onManagePayers,
}: Props) {
  const [expandedPayers, setExpandedPayers] = useState<Set<string>>(new Set());

  const splitTotal = expenses.filter((e) => e.split).reduce((s, e) => s + e.amount, 0);
  const owedPerPayer = splitTotal / 2;

  function toggleExpand(id: string) {
    setExpandedPayers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (payers.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 py-4 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>No payers configured — add someone to track what they owe.</span>
        </div>
        <Button variant="outline" size="sm" onClick={onManagePayers} className="shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add payer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payers.map((payer) => {
        const payerPayments = payments.filter((p) => p.payer_id === payer.id);
        const totalPaid = payerPayments.reduce((s, p) => s + p.amount, 0);
        const balance = owedPerPayer - totalPaid;
        const isPaidUp = balance <= 0.005;
        const isExpanded = expandedPayers.has(payer.id);

        return (
          <div
            key={payer.id}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: payer.color + "30" }}
          >
            {/* Payer header — 2-row layout works on mobile and desktop */}
            <div
              className="px-4 py-3 space-y-2"
              style={{ backgroundColor: payer.color + "08" }}
            >
              {/* Row 1: avatar + name + balance */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: payer.color }}
                >
                  {payer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{payer.name}</p>
                    {payer.is_owner && (
                      <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">you</span>
                    )}
                  </div>
                  {isPaidUp ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Paid up</span>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm tabular-nums" style={{ color: payer.color }}>
                        {fmt.format(balance)}
                      </p>
                      <p className="text-xs text-slate-400 leading-none">due</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: stats + actions */}
              <div className="flex items-center justify-between pl-[52px]">
                <p className="text-xs text-slate-500">
                  Owed {fmt.format(owedPerPayer)} · Paid {fmt.format(totalPaid)}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => onRecordPayment(payer.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Pay
                  </Button>
                  {payerPayments.length > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-slate-600"
                      onClick={() => toggleExpand(payer.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment history */}
            {isExpanded && payerPayments.length > 0 && (
              <div className="border-t divide-y" style={{ borderColor: payer.color + "20" }}>
                {payerPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 px-4 py-2.5 bg-white group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-slate-800">
                          {fmt.format(payment.amount)}
                        </span>
                        {payment.note && (
                          <span className="text-xs text-slate-400 truncate">{payment.note}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(payment.date)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                      onClick={() => onDeletePayment(payment.id)}
                      aria-label="Delete payment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
