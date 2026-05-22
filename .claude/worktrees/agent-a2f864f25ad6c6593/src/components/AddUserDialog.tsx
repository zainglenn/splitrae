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
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddUserDialog({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to create user");
    } else {
      setSuccess(`User ${json.email} created successfully.`);
      setEmail("");
      setPassword("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="new-email" className="text-sm font-medium">Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm font-medium">Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{success}</p>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} className="flex-1 sm:flex-none">
              Close
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
