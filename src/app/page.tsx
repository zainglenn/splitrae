"use client";

import { useState, useMemo, useEffect } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar, AppView } from "@/components/AppSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";
import { DashboardView } from "@/components/DashboardView";
import { StatsCards } from "@/components/StatsCards";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { AuthGate } from "@/components/AuthGate";
import { AddUserDialog } from "@/components/AddUserDialog";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { Expense, Category } from "@/types/expense";
import { Loader2 } from "lucide-react";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function TrackerApp({ userId }: { userId: string }) {
  const today = new Date();
  const [view, setView] = useState<AppView>("dashboard");
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(today));
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);

  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(currentMonth, userId);
  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null);

  const isCurrentMonth = currentMonth === toMonthKey(today);
  const defaultDate = isCurrentMonth ? toLocalDateString(today) : currentMonth + "-01";
  const currentYear = Number(currentMonth.split("-")[0]);

  // Clear category filter when month changes
  useEffect(() => { setActiveCategoryFilter(null); }, [currentMonth]);

  function openAdd() { setEditingExpense(null); setFormOpen(true); }
  function openEdit(expense: Expense) { setEditingExpense(expense); setFormOpen(true); }
  function handleSave(data: Omit<Expense, "id">) {
    editingExpense ? updateExpense(editingExpense.id, data) : addExpense(data);
  }

  function handleMonthClick(month: string) {
    setCurrentMonth(month);
    setView("month");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onViewChange={setView}
        currentMonth={currentMonth}
        onMonthChange={handleMonthClick}
        onAddUser={() => setAddUserOpen(true)}
      />

      <SidebarInset className="flex flex-col min-h-svh bg-muted/30">
        <DashboardTopbar
          view={view}
          monthLabel={formatMonthLabel(currentMonth)}
          year={currentYear}
          onAddExpense={openAdd}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-safe space-y-5">
          {view === "dashboard" ? (
            <DashboardView
              userId={userId}
              year={currentYear}
              onMonthClick={handleMonthClick}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <StatsCards expenses={expenses} />
              {expenses.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CategoryBreakdown
                      expenses={expenses}
                      activeCategory={activeCategoryFilter}
                      onFilterCategory={setActiveCategoryFilter}
                    />
                  </CardContent>
                </Card>
              )}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ExpenseList
                    expenses={expenses}
                    onEdit={openEdit}
                    onDelete={deleteExpense}
                    filterCategory={activeCategoryFilter}
                    onClearCategoryFilter={() => setActiveCategoryFilter(null)}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </SidebarInset>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingExpense}
        defaultDate={defaultDate}
      />
      <AddUserDialog open={addUserOpen} onClose={() => setAddUserOpen(false)} />
    </SidebarProvider>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <AuthGate />;
  return <TrackerApp userId={user.id} />;
}
