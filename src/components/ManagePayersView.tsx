"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSection } from "@/components/PageSection";
import { usePayers } from "@/hooks/usePayers";
import { supabase } from "@/lib/supabase";
import { PAYER_COLORS } from "@/types/payer";
import { Trash2, Plus, Loader2, Link2, Link2Off, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  userId: string;
}

export function ManagePayersView({ userId }: Props) {
  const { payers, addPayer, deletePayer, linkPayer, unlinkPayer } = usePayers(userId);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PAYER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Link state: which payer is being linked, and the email input
  const [linkingPayerId, setLinkingPayerId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkStatus, setLinkStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await addPayer(name.trim(), color);
    setName("");
    setColor(PAYER_COLORS[0]);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deletePayer(id);
    setConfirmDeleteId(null);
  }

  async function handleLink(payerId: string) {
    if (!linkEmail.trim()) return;
    setLinkSaving(true);
    setLinkStatus(null);

    // Look up user by email in profiles table
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", linkEmail.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      setLinkStatus({ type: "error", msg: "No account found with that email." });
      setLinkSaving(false);
      return;
    }

    await linkPayer(payerId, data.id);
    setLinkStatus({ type: "success", msg: `Linked to ${data.email}` });
    setLinkingPayerId(null);
    setLinkEmail("");
    setLinkSaving(false);
  }

  function openLink(payerId: string) {
    setLinkingPayerId(payerId);
    setLinkEmail("");
    setLinkStatus(null);
  }

  return (
    <div className="space-y-5">
      <PageSection
        title="Payers"
        description="People who share split expenses with you. Link a payer to a user account so they get a shared view when they log in."
      >
        <div className="space-y-2">
          {payers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No payers yet.</p>
          )}
          {payers.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.linked_user_id && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Link2 className="h-3 w-3" />
                      Linked account
                    </p>
                  )}
                </div>
                {p.is_owner ? (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium shrink-0">
                    you
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {p.linked_user_id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                        title="Unlink account"
                        onClick={() => unlinkPayer(p.id)}
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 transition-colors ${
                          linkingPayerId === p.id
                            ? "text-blue-600 bg-blue-50"
                            : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                        }`}
                        title="Link to user account"
                        onClick={() => linkingPayerId === p.id ? setLinkingPayerId(null) : openLink(p.id)}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 transition-colors ${
                        confirmDeleteId === p.id
                          ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                          : "text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      }`}
                      onClick={() => handleDelete(p.id)}
                      title={confirmDeleteId === p.id ? "Click again to confirm" : "Delete payer"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Inline link form */}
              {linkingPayerId === p.id && (
                <div className="ml-11 flex items-center gap-2 flex-wrap">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="h-8 text-sm max-w-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleLink(p.id)}
                  />
                  <Button size="sm" className="h-8 gap-1" disabled={linkSaving || !linkEmail.trim()} onClick={() => handleLink(p.id)}>
                    {linkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Link
                  </Button>
                  {linkStatus && (
                    <span className={`flex items-center gap-1 text-xs ${linkStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                      {linkStatus.type === "success"
                        ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : <AlertCircle className="h-3.5 w-3.5" />
                      }
                      {linkStatus.msg}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Add Payer">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            placeholder="Name (e.g. Wife, Partner)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-base"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Color</p>
            <div className="flex gap-2 flex-wrap">
              {PAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: color === c ? "2px" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={saving || !name.trim()} className="w-full sm:w-auto h-11 gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Payer
          </Button>
        </form>
      </PageSection>
    </div>
  );
}
