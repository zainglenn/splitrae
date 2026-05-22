"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";
import { AppView } from "./AppSidebar";

interface Props {
  view: AppView;
  monthLabel: string;
  currentMonth: string;
  onBack?: () => void;
  isGuest?: boolean;
}

const VIEW_TITLES: Record<string, string> = {
  "history": "Home",
  "next-month": "Next Month",
  "clean-data": "AI Advisor",
  "manage-payers": "Manage Payers",
  "manage-budgets": "Budgets",
  "admin": "Users",
  "add-expense": "Add Expense",
  "installments": "Installments",
};

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardTopbar({ view, monthLabel, currentMonth, onBack, isGuest: _isGuest }: Props) {
  const title =
    view === "month" ? monthLabel :
    VIEW_TITLES[view] ?? "";

  const isHistoricalMonth = view === "month" && currentMonth !== toMonthKey(new Date());

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      {isHistoricalMonth && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors text-sm -ml-1 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </button>
      )}
      <span className="font-semibold text-sm flex-1 truncate">{title}</span>
    </header>
  );
}
