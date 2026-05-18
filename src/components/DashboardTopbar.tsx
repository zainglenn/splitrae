"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { AppView } from "./AppSidebar";

interface Props {
  view: AppView;
  monthLabel: string;
  year: number;
  currentMonth: string;
  onAddExpense: () => void;
  onBack?: () => void;
  isGuest?: boolean;
}

const VIEW_TITLES: Record<string, string> = {
  "history": "History",
  "next-month": "Next Month",
  "clean-data": "AI Advisor",
  "manage-payers": "Manage Payers",
  "manage-budgets": "Budgets",
  "admin": "Users",
};

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardTopbar({ view, monthLabel, year, currentMonth, onAddExpense, onBack, isGuest }: Props) {
  const title =
    view === "dashboard" ? `${year} Overview` :
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
      {view === "month" && !isGuest && (
        <Button size="sm" className="gap-1.5 h-8" onClick={onAddExpense}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Add</span>
        </Button>
      )}
    </header>
  );
}
