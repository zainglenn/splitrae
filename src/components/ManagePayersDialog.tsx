"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus, Users } from "lucide-react";
import { Payer, PAYER_COLORS } from "@/types/payer";

interface Props {
  open: boolean;
  onClose: () => void;
  payers: Payer[];
  onAdd: (name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ManagePayersDialog({ open, onClose, payers, onAdd, onDelete }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PAYER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim(), color);
    setName("");
    setColor(PAYER_COLORS[0]);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await onDelete(id);
    setConfirmDeleteId(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setConfirmDeleteId(null); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Payers
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            People who share split expenses with you.
          </p>
        </DialogHeader>

        {/* Existing payers */}
        <div className="space-y-2 my-1">
          {payers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No payers yet.</p>
          )}
          {payers.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 font-medium text-sm">{p.name}</span>
              {p.is_owner ? (
                <span className="text-xs px-2 py-1 rounded-md bg-slate-200 text-slate-500 font-medium shrink-0">you</span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 shrink-0 transition-colors ${
                    confirmDeleteId === p.id
                      ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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

        {/* Add payer form */}
        <form onSubmit={handleAdd} className="space-y-3 border-t pt-4">
          <Label className="text-sm font-medium">Add payer</Label>
          <Input
            placeholder="Name (e.g. Wife, Partner)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: color === c ? "2px" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full gap-1.5" disabled={saving || !name.trim()}>
            <Plus className="h-4 w-4" />
            Add payer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
