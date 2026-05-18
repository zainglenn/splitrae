"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PageSection } from "@/components/PageSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreateAdminDialog } from "@/components/CreateAdminDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, User, Loader2, RefreshCw, KeyRound, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? "";
  }

  async function handleRoleChange(targetId: string | null, role: string) {
    if (!targetId) return;
    setRoleLoading(targetId);
    const token = await getToken();
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: targetId, role }),
    });
    setRoleLoading(null);
    loadUsers();
  }

  async function handleDelete(targetId: string) {
    if (deleteConfirmId !== targetId) {
      setDeleteConfirmId(targetId);
      return;
    }
    setActionLoading(targetId);
    const token = await getToken();
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: targetId }),
    });
    setDeleteConfirmId(null);
    setActionLoading(null);
    loadUsers();
  }

  return (
    <div className="space-y-5">
      <PageSection title="Users" description="All registered accounts in this workspace.">
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateAdminOpen(true)} className="gap-1.5">
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
                    <th className="px-4 py-3" />
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
                            <div className="sm:hidden mt-1">
                              {u.id === userId ? (
                                <RoleBadge role={u.role} />
                              ) : (
                                <Select
                                  value={u.role}
                                  onValueChange={(val) => val && handleRoleChange(u.id, val)}
                                  disabled={roleLoading === u.id}
                                >
                                  <SelectTrigger className="h-6 text-xs w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="read">read</SelectItem>
                                    <SelectItem value="write">write</SelectItem>
                                    <SelectItem value="admin">admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                          {u.id === userId && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">you</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {u.id === userId ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <div className="relative w-28">
                            {roleLoading === u.id && (
                              <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground z-10 pointer-events-none" />
                            )}
                            <Select
                              value={u.role}
                              onValueChange={(val) => val && handleRoleChange(u.id, val)}
                              disabled={roleLoading === u.id}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="read">read</SelectItem>
                                <SelectItem value="write">write</SelectItem>
                                <SelectItem value="admin">admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(u.last_sign_in_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Reset password"
                            onClick={() => setResetTarget(u)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {u.id !== userId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === u.id}
                              className={`h-8 w-8 transition-colors ${
                                deleteConfirmId === u.id
                                  ? "text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30"
                                  : "text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              }`}
                              title={deleteConfirmId === u.id ? "Click again to confirm delete" : "Delete user"}
                              onClick={() => handleDelete(u.id)}
                            >
                              {actionLoading === u.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                            </Button>
                          )}
                        </div>
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

      <ResetPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(null)}
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

function ResetPasswordDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) { setPassword(""); setError(""); setSuccess(""); onClose(); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSuccess("");
    setSubmitting(true);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: user.id, password }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to reset password");
    } else {
      setSuccess("Password updated successfully.");
      setPassword("");
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Reset Password
          </DialogTitle>
          <DialogDescription className="truncate">
            Set a new password for <span className="font-medium text-foreground">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />{success}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
