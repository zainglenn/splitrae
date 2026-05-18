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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronRight, CalendarRange, CalendarDays, LayoutDashboard, Wallet, LogOut, Users, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shortMonth(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", { month: "long" });
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function getYearMonthMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start) {
    const key = toMonthKey(d);
    const year = key.split("-")[0];
    if (!map[year]) map[year] = [];
    map[year].push(key);
    d.setMonth(d.getMonth() - 1);
  }
  return map;
}

export type AppView = "dashboard" | "month" | "clean-data" | "manage-payers" | "manage-budgets" | "admin";

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
  const yearMonthMap = getYearMonthMap();
  const years = Object.keys(yearMonthMap).sort((a, b) => Number(b) - Number(a));
  const currentYear = currentMonth.split("-")[0];

  const [openYears, setOpenYears] = useState<Set<string>>(new Set([currentYear]));
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  function selectMonth(month: string) {
    onMonthChange(month);
    onViewChange("month");
    setOpenMobile(false);
  }

  function selectDashboard() {
    onViewChange("dashboard");
    setOpenMobile(false);
  }

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
                <span className="font-semibold text-sm">Expense Tracker</span>
                <span className="text-xs opacity-60">AED</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Top nav: Dashboard + Active Month */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={view === "dashboard"} onClick={selectDashboard} tooltip="Dashboard">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
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
          </SidebarMenu>
        </SidebarGroup>

        {/* Year → Month history tree */}
        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarMenu>
            {years.map((year) => (
              <Collapsible
                key={year}
                open={openYears.has(year)}
                onOpenChange={() => toggleYear(year)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={year} onClick={() => toggleYear(year)}>
                    <CalendarRange className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{year}</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${openYears.has(year) ? "rotate-90" : ""}`}
                    />
                  </SidebarMenuButton>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {yearMonthMap[year].map((month) => (
                        <SidebarMenuSubItem key={month}>
                          <SidebarMenuSubButton
                            isActive={view === "month" && month === currentMonth}
                            onClick={() => selectMonth(month)}
                          >
                            {shortMonth(month)}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
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
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>Budgets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={view === "clean-data"} onClick={() => nav("clean-data")} tooltip="AI Advisor">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>AI Advisor</span>
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
