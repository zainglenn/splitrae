"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PageSection } from "@/components/PageSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateAdminDialog } from "@/components/CreateAdminDialog";
import { ShieldCheck, User, Loader2, RefreshCw } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  userId: string;
}

export function AdminView({ userId }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div className="space-y-5">
      <PageSection
        title="Users"
        description="All registered accounts in this workspace."
      >
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateAdminOpen(true)}
              className="gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Create Admin
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No users found.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Sign In</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {u.role === "admin"
                              ? <ShieldCheck className="h-4 w-4 text-violet-500" />
                              : <User className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{u.email}</div>
                            <div className="sm:hidden mt-0.5">
                              <RoleBadge role={u.role} />
                            </div>
                          </div>
                          {u.id === userId && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">you</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {formatDate(u.last_sign_in_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageSection>

      <CreateAdminDialog
        open={createAdminOpen}
        onClose={() => setCreateAdminOpen(false)}
        onCreated={loadUsers}
      />
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800" variant="outline">
      admin
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
      user
    </Badge>
  );
}
