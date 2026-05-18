"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppView } from "./AppSidebar";

interface Props {
  view: AppView;
  monthLabel: string;
  year: number;
  onAddExpense: () => void;
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

export function DashboardTopbar({ view, monthLabel, year, onAddExpense, isGuest }: Props) {
  const title =
    view === "dashboard" ? `${year} Overview` :
    view === "month" ? monthLabel :
    VIEW_TITLES[view] ?? "";

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
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
