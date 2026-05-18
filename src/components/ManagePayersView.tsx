"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSection } from "@/components/PageSection";
import { usePayers } from "@/hooks/usePayers";
import { PAYER_COLORS } from "@/types/payer";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface Props {
  userId: string;
}

export function ManagePayersView({ userId }: Props) {
  const { payers, addPayer, deletePayer } = usePayers(userId);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PAYER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  return (
    <div className="space-y-5 max-w-lg">
      {/* Current payers */}
      <PageSection
        title="Payers"
        description="People who share split expenses with you."
      >
        <div className="space-y-2">
          {payers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No payers yet.</p>
          )}
          {payers.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 font-medium text-sm">{p.name}</span>
              {p.is_owner ? (
                <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium shrink-0">
                  you
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 shrink-0 transition-colors ${
                    confirmDeleteId === p.id
                      ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                      : "text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                  }`}
                  onClick={() => handleDelete(p.id)}
                  title={confirmDeleteId === p.id ? "Click again to confirm" : "Delete payer"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </PageSection>

      {/* Add payer */}
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
