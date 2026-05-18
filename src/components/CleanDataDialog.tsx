"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Change {
  id: string;
  description?: string;
  category?: string;
}

interface Result {
  total: number;
  fixed: number;
  changes: Change[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function CleanDataDialog({ open, onClose, onComplete }: Props) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function runCleanup() {
    setStatus("running");
    setResult(null);
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/ai/bulk-normalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json() as Result;
      setResult(data);
      setStatus("done");
      if (data.fixed > 0) onComplete?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  function handleClose() {
    if (status === "running") return;
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Data Cleanup
          </DialogTitle>
          <DialogDescription>
            Scan all your expenses and fix messy titles and wrong categories using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {status === "idle" && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Normalize merchant names (e.g. "MCDONALDS #1234" → "McDonald's")</li>
                <li>Fix miscategorized expenses</li>
                <li>Only update entries that need changes</li>
              </ul>
            </div>
          )}

          {status === "running" && (
            <div className="flex items-center gap-3 py-4 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analyzing your expenses…</span>
            </div>
          )}

          {status === "done" && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Scanned <strong>{result.total}</strong> expense{result.total !== 1 ? "s" : ""} —{" "}
                  <strong>{result.fixed}</strong> updated
                </span>
              </div>

              {result.changes.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-md border p-2 bg-muted/30">
                  {result.changes.map((c) => (
                    <div key={c.id} className="text-xs flex flex-wrap items-center gap-1.5 py-0.5">
                      {c.description && (
                        <span className="font-medium truncate max-w-[200px]">{c.description}</span>
                      )}
                      {c.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {c.category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Everything looks clean — no changes needed.</p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg || "Something went wrong. Please try again."}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={status === "running"}>
              {status === "done" ? "Close" : "Cancel"}
            </Button>
            {status !== "done" && (
              <Button onClick={runCleanup} disabled={status === "running"}>
                {status === "running" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Running…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {status === "error" ? "Retry" : "Run Cleanup"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
