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
import { ManagePayersView } from "@/components/ManagePayersView";
import { ManageBudgetsView } from "@/components/ManageBudgetsView";
import { AdminView } from "@/components/AdminView";
import { HouseholdBalance } from "@/components/HouseholdBalance";
import { AIInsightsCard } from "@/components/AIInsightsCard";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { RecurringBanner } from "@/components/RecurringBanner";
import { CleanDataView } from "@/components/CleanDataView";
import { HistoryView } from "@/components/HistoryView";
import { ImportExpensesPage } from "@/components/ImportExpensesPage";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayers } from "@/hooks/usePayers";
import { usePayments } from "@/hooks/usePayments";
import { useBudgets } from "@/hooks/useBudgets";
import { useHousehold } from "@/hooks/useHousehold";
import { useProfile } from "@/hooks/useProfile";
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
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonth = toMonthKey(nextMonthDate);
  const [view, setView] = useState<AppView>("dashboard");
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(today));
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [recordPaymentPayerId, setRecordPaymentPayerId] = useState<string | null>(null);

  // Resolve household: guest users share an owner's data
  const { ownerId, myPayerId, isGuest, loading: householdLoading } = useHousehold(userId);
  const { isReadOnly: isRoleReadOnly } = useProfile(userId);
  const isReadOnly = isGuest || isRoleReadOnly;

  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(currentMonth, ownerId);
  const { payers, addPayer, deletePayer, linkPayer, unlinkPayer } = usePayers(ownerId);
  const { payments, addPayment, deletePayment } = usePayments(currentMonth, ownerId);
  const { budgets, setBudget, deleteBudget } = useBudgets(ownerId, currentMonth);

  const prevMonth = (() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const { expenses: prevMonthExpenses } = useExpenses(prevMonth, ownerId);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null);
  const recordingPayer = payers.find((p) => p.id === recordPaymentPayerId) ?? null;
  const isCurrentMonth = currentMonth === toMonthKey(today);
  const defaultDate = isCurrentMonth ? toLocalDateString(today) : currentMonth + "-01";
  const currentYear = Number(currentMonth.split("-")[0]);

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

  if (householdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onViewChange={setView}
        currentMonth={currentMonth}
        onMonthChange={handleMonthClick}
        userId={userId}
        isGuest={isGuest}
      />

      <SidebarInset className="flex flex-col min-h-svh bg-muted/30">
        <DashboardTopbar
          view={view}
          monthLabel={formatMonthLabel(currentMonth)}
          year={currentYear}
          currentMonth={currentMonth}
          onAddExpense={openAdd}
          onBack={() => setView("history")}
          isGuest={isReadOnly}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-safe space-y-4 sm:space-y-5">
          {view === "import-expenses" ? (
            <ImportExpensesPage
              userId={ownerId}
              currentMonth={currentMonth}
              onNavigateToMonth={handleMonthClick}
            />
          ) : view === "clean-data" ? (
            <CleanDataView userId={ownerId} />
          ) : view === "history" ? (
            <HistoryView userId={ownerId} onMonthClick={handleMonthClick} />
          ) : view === "next-month" ? (
            <ManageBudgetsView userId={ownerId} month={nextMonth} />
          ) : view === "manage-payers" ? (
            <ManagePayersView userId={ownerId} />
          ) : view === "manage-budgets" ? (
            <ManageBudgetsView userId={ownerId} month={currentMonth} />
          ) : view === "admin" ? (
            <AdminView userId={userId} />
          ) : view === "dashboard" ? (
            <DashboardView
              userId={ownerId}
              year={currentYear}
              myPayerId={myPayerId}
              numPayers={payers.length}
              onMonthClick={handleMonthClick}
              currentMonthExpenses={expenses}
              currentMonthBudgets={budgets}
              onManageBudgets={() => setView("manage-budgets")}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {isCurrentMonth && !isReadOnly && (
                <RecurringBanner
                  currentMonth={currentMonth}
                  currentExpenses={expenses}
                  prevMonthExpenses={prevMonthExpenses}
                  onAddRecurring={handleAddRecurring}
                />
              )}
              <StatsCards expenses={expenses} currentMonth={currentMonth} />
              <AIInsightsCard expenses={expenses} month={currentMonth} />
              {!isReadOnly && (
                <BudgetProgressCard
                  expenses={expenses}
                  budgets={budgets}
                  onManageBudgets={() => setView("manage-budgets")}
                />
              )}
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
                    onRecordPayment={isReadOnly ? undefined : setRecordPaymentPayerId}
                    onDeletePayment={isReadOnly ? undefined : deletePayment}
                    onManagePayers={isReadOnly ? undefined : () => setView("manage-payers")}
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
                    onEdit={isReadOnly ? undefined : openEdit}
                    onDelete={isReadOnly ? undefined : deleteExpense}
                    filterCategory={activeCategoryFilter}
                    onClearCategoryFilter={() => setActiveCategoryFilter(null)}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </SidebarInset>

      {!isReadOnly && (
        <ExpenseForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          initialData={editingExpense}
          defaultDate={defaultDate}
        />
      )}
      {recordingPayer && !isReadOnly && (
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
