"use client";

import { useState, useMemo, useEffect } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, AppView } from "@/components/AppSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";
import { StatsCards } from "@/components/StatsCards";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { AuthGate } from "@/components/AuthGate";
import { ManagePayersView } from "@/components/ManagePayersView";
import { ManageBudgetsView } from "@/components/ManageBudgetsView";
import { AdminView } from "@/components/AdminView";
import { HouseholdBalance } from "@/components/HouseholdBalance";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { HistoryView } from "@/components/HistoryView";
import { ImportExpensesPage } from "@/components/ImportExpensesPage";
import { SplitPayView } from "@/components/SplitPayView";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { RecurringBanner } from "@/components/RecurringBanner";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayers } from "@/hooks/usePayers";
import { usePayments } from "@/hooks/usePayments";
import { useBudgets } from "@/hooks/useBudgets";
import { useHousehold } from "@/hooks/useHousehold";
import { useProfile } from "@/hooks/useProfile";
import { Expense, Category, MonthKey } from "@/types/expense";
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
  const [view, setView] = useState<AppView>("history");
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(today));
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [recordPaymentPayerId, setRecordPaymentPayerId] = useState<string | null>(null);

  // Resolve household: guest users share an owner's data
  const { ownerId, myPayerId, isGuest, loading: householdLoading } = useHousehold(userId);
  const { isReadOnly: isRoleReadOnly } = useProfile(userId);
  const isReadOnly = isGuest || isRoleReadOnly;

  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(currentMonth, ownerId);
  const [py, pm] = currentMonth.split("-").map(Number);
  const prevMonth: MonthKey = pm === 1 ? `${py - 1}-12` : `${py}-${String(pm - 1).padStart(2, "0")}`;
  const { expenses: prevExpenses } = useExpenses(prevMonth, ownerId);
  const { payers, addPayer, deletePayer, linkPayer, unlinkPayer } = usePayers(ownerId);
  const { payments, addPayment, deletePayment } = usePayments(currentMonth, ownerId);
  const { budgets, setBudget, deleteBudget } = useBudgets(ownerId, currentMonth);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null);
  const recordingPayer = payers.find((p) => p.id === recordPaymentPayerId) ?? null;
  const isCurrentMonth = currentMonth === toMonthKey(today);
  const defaultDate = isCurrentMonth ? toLocalDateString(today) : currentMonth + "-01";

  useEffect(() => { setActiveCategoryFilter(null); }, [currentMonth]);

  function openEdit(expense: Expense) { setEditingExpense(expense); setFormOpen(true); }
  function handleSave(data: Omit<Expense, "id">) {
    if (editingExpense) updateExpense(editingExpense.id, data);
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
          currentMonth={currentMonth}
          onBack={() => setView("history")}
          isGuest={isReadOnly}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-safe space-y-4 sm:space-y-5">
          {view === "add-expense" ? (
            <ImportExpensesPage
              userId={ownerId}
              currentMonth={currentMonth}
              onNavigateToMonth={handleMonthClick}
            />
          ) : view === "installments" ? (
            <SplitPayView userId={ownerId} />
          ) : view === "history" ? (
            <HistoryView userId={ownerId} onMonthClick={handleMonthClick} />
          ) : view === "manage-payers" ? (
            <ManagePayersView userId={ownerId} />
          ) : view === "manage-budgets" ? (
            <ManageBudgetsView userId={ownerId} month={currentMonth} />
          ) : view === "admin" ? (
            <AdminView userId={userId} />
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
                  prevMonthExpenses={prevExpenses}
                  onAddRecurring={async (items) => {
                    for (const item of items) await addExpense(item);
                  }}
                />
              )}
              <StatsCards
                expenses={expenses}
                currentMonth={currentMonth}
                payments={payments}
                payerCount={payers.length}
                myPayerId={myPayerId}
              />
{!isReadOnly && (
                <BudgetProgressCard
                  expenses={expenses}
                  budgets={budgets}
                  onManageBudgets={() => setView("manage-budgets")}
                />
              )}
              <CollapsibleCard title="Household Balance">
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
              </CollapsibleCard>
              {expenses.length > 0 && (
                <CollapsibleCard title="By Category">
                  <CategoryBreakdown
                    expenses={expenses}
                    activeCategory={activeCategoryFilter}
                    onFilterCategory={setActiveCategoryFilter}
                  />
                </CollapsibleCard>
              )}
              <CollapsibleCard title="Transactions">
                <ExpenseList
                  expenses={expenses}
                  onEdit={isReadOnly ? undefined : openEdit}
                  onDelete={isReadOnly ? undefined : deleteExpense}
                  filterCategory={activeCategoryFilter}
                  onClearCategoryFilter={() => setActiveCategoryFilter(null)}
                />
              </CollapsibleCard>
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
