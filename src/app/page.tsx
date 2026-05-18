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
import { ManagePayersDialog } from "@/components/ManagePayersDialog";
import { HouseholdBalance } from "@/components/HouseholdBalance";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { ManageBudgetsDialog } from "@/components/ManageBudgetsDialog";
import { RecurringBanner } from "@/components/RecurringBanner";
import { CleanDataDialog } from "@/components/CleanDataDialog";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayers } from "@/hooks/usePayers";
import { usePayments } from "@/hooks/usePayments";
import { useBudgets } from "@/hooks/useBudgets";
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
  const [managePayersOpen, setManagePayersOpen] = useState(false);
  const [recordPaymentPayerId, setRecordPaymentPayerId] = useState<string | null>(null);
  const [manageBudgetsOpen, setManageBudgetsOpen] = useState(false);
  const [cleanDataOpen, setCleanDataOpen] = useState(false);

  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(currentMonth, userId);
  const { payers, addPayer, deletePayer } = usePayers(userId);
  const { payments, addPayment, deletePayment } = usePayments(currentMonth, userId);
  const { budgets, setBudget, deleteBudget } = useBudgets(userId);

  // Fetch previous month's recurring expenses for RecurringBanner
  const prevMonth = (() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const { expenses: prevMonthExpenses } = useExpenses(prevMonth, userId);
  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null);

  const recordingPayer = payers.find((p) => p.id === recordPaymentPayerId) ?? null;

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

  async function handleAddRecurring(exps: Omit<Expense, "id">[]) {
    for (const e of exps) await addExpense(e);
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
        onManagePayers={() => setManagePayersOpen(true)}
        onCleanData={() => setCleanDataOpen(true)}
      />

      <SidebarInset className="flex flex-col min-h-svh bg-muted/30">
        <DashboardTopbar
          view={view}
          monthLabel={formatMonthLabel(currentMonth)}
          year={currentYear}
          onAddExpense={openAdd}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-safe space-y-4 sm:space-y-5">
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
              {isCurrentMonth && (
                <RecurringBanner
                  currentMonth={currentMonth}
                  currentExpenses={expenses}
                  prevMonthExpenses={prevMonthExpenses}
                  onAddRecurring={handleAddRecurring}
                />
              )}
              <StatsCards expenses={expenses} currentMonth={currentMonth} />
              <AIInsightsCard expenses={expenses} month={currentMonth} />
              <BudgetProgressCard
                expenses={expenses}
                budgets={budgets}
                onManageBudgets={() => setManageBudgetsOpen(true)}
              />
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-sm font-semibold">Household Balance</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <HouseholdBalance
                    expenses={expenses}
                    payers={payers}
                    payments={payments}
                    month={currentMonth}
                    defaultDate={defaultDate}
                    onRecordPayment={setRecordPaymentPayerId}
                    onDeletePayment={deletePayment}
                    onManagePayers={() => setManagePayersOpen(true)}
                  />
                </CardContent>
              </Card>
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
                    onUpdate={updateExpense}
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
      <ManagePayersDialog
        open={managePayersOpen}
        onClose={() => setManagePayersOpen(false)}
        payers={payers}
        onAdd={addPayer}
        onDelete={deletePayer}
      />
      <ManageBudgetsDialog
        open={manageBudgetsOpen}
        onClose={() => setManageBudgetsOpen(false)}
        budgets={budgets}
        onSet={setBudget}
        onDelete={deleteBudget}
      />
      <CleanDataDialog
        open={cleanDataOpen}
        onClose={() => setCleanDataOpen(false)}
      />
      {recordingPayer && (
        <RecordPaymentDialog
          open={!!recordPaymentPayerId}
          onClose={() => setRecordPaymentPayerId(null)}
          payerName={recordingPayer.name}
          payerColor={recordingPayer.color}
          defaultDate={defaultDate}
          remaining={
            expenses.reduce((s, e) => s + e.amount, 0) / payers.length -
            payments.filter((p) => p.payer_id === recordingPayer.id).reduce((s, p) => s + p.amount, 0)
          }
          onSave={(data) =>
            addPayment({
              payer_id: recordingPayer.id,
              amount: data.amount,
              date: data.date,
              note: data.note,
              month: currentMonth,
            })
          }
        />
      )}
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
