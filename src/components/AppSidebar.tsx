"use client";

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, CalendarDays, CalendarPlus, Wallet, LogOut, Users, ShieldCheck, Upload, PiggyBank, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}


function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}


export type AppView = "month" | "history" | "manage-payers" | "manage-budgets" | "admin" | "add-expense" | "installments";

interface Props {
  view: AppView;
  onViewChange: (view: AppView) => void;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  userId: string;
  isGuest?: boolean;
}

export function AppSidebar({ view, onViewChange, currentMonth, onMonthChange, userId, isGuest }: Props) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useProfile(userId);
  const { setOpenMobile } = useSidebar();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  function nav(v: AppView) {
    onViewChange(v);
    setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-semibold text-sm">Splitr</span>
                <span className="text-xs opacity-60">AED</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Top nav */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={view === "history" || (view === "month" && currentMonth !== toMonthKey(new Date()))} onClick={() => nav("history")} tooltip="Home">
                <Home className="h-4 w-4 shrink-0" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={view === "month" && currentMonth === toMonthKey(new Date())}
                onClick={() => { onMonthChange(toMonthKey(new Date())); onViewChange("month"); setOpenMobile(false); }}
                tooltip={`Active Month — ${formatMonthLabel(toMonthKey(new Date()))}`}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Active Month</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={view === "month" && currentMonth === toMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}
                onClick={() => { onMonthChange(toMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))); onViewChange("month"); setOpenMobile(false); }}
                tooltip={`Next Month — ${formatMonthLabel(toMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)))}`}
              >
                <CalendarPlus className="h-4 w-4 shrink-0" />
                <span>Next Month</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton isActive={view === "add-expense"} onClick={() => nav("add-expense")} tooltip="Add Expense">
                <Upload className="h-4 w-4 shrink-0" />
                <span>Add Expense</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton isActive={view === "installments"} onClick={() => nav("installments")} tooltip="Installments">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Installments</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings — hidden for guest/linked users */}
        {!isGuest && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === "manage-payers"} onClick={() => nav("manage-payers")} tooltip="Manage Payers">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Manage Payers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === "manage-budgets"} onClick={() => nav("manage-budgets")} tooltip="Manage Budgets">
                  <PiggyBank className="h-4 w-4 shrink-0" />
                  <span>Budgets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Admin (only shown to admins) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === "admin"} onClick={() => nav("admin")} tooltip="Users">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Users</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 rounded-lg shrink-0">
            <AvatarFallback className="rounded-lg bg-white/15 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium truncate">{user?.email}</span>
            <span className="text-xs opacity-60">{isAdmin ? "Admin" : "Account"}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-rose-400 hover:bg-white/10 group-data-[collapsible=icon]:hidden"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
