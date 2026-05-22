"use client";

import { Expense } from "@/types/expense";
import { Payment } from "@/types/payer";
import { TrendingUp, Users, CalendarClock, Wallet } from "lucide-react";
import { StatCard } from "@/components/StatCard";

interface Props {
  expenses: Expense[];
  currentMonth?: string;
  payments?: Payment[];
  payerCount?: number;
  myPayerId?: string | null;
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

export function StatsCards({ expenses, currentMonth, payments, payerCount, myPayerId }: Props) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const yourHalf = total / 2;

  const forecast = (() => {
    if (!currentMonth) return null;
    const today = new Date();
    const nowMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    if (currentMonth !== nowMonth || total === 0) return null;
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return (total / dayOfMonth) * daysInMonth;
  })();

  const remainingBill = (() => {
    if (!myPayerId || !payments) return null;
    const n = payerCount && payerCount > 0 ? payerCount : 2;
    const myShare = total / n;
    const myPaid = payments.filter((p) => p.payer_id === myPayerId).reduce((s, p) => s + p.amount, 0);
    return myShare - myPaid;
  })();

  return (
    <div className={`grid gap-4 ${forecast !== null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
      <StatCard
        title="Total Spent"
        value={fmt.format(total)}
        subtitle="this month"
        icon={TrendingUp}
        iconBgClass="bg-accent"
        iconClass="text-primary"
      />
      <StatCard
        title="Your Half"
        value={fmt.format(yourHalf)}
        subtitle="50% of total"
        icon={Users}
        iconBgClass="bg-blue-50"
        iconClass="text-blue-600"
      />
      <StatCard
        title="Remaining Bill"
        value={remainingBill !== null ? fmt.format(Math.max(0, remainingBill)) : "—"}
        subtitle={remainingBill !== null ? (remainingBill <= 0 ? "fully paid" : "still owed") : undefined}
        icon={Wallet}
        iconBgClass="bg-emerald-50"
        iconClass="text-emerald-600"
        valueClass={remainingBill !== null && remainingBill <= 0 ? "text-green-600" : ""}
      />
      {forecast !== null && (
        <StatCard
          title="Projected"
          value={fmt.format(forecast)}
          subtitle="at current pace"
          icon={CalendarClock}
          iconBgClass="bg-orange-50"
          iconClass="text-orange-500"
        />
      )}
    </div>
  );
}
