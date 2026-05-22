"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { StagingTable } from "@/components/import/StagingTable";
import type { StagedExpense } from "@/components/ImportExpensesPage";

interface Props {
  staged: StagedExpense[];
  onStagedChange: (rows: StagedExpense[]) => void;
  invalidIds?: Set<string>;
}

interface ExtractionResult {
  count: number;
  error?: string;
}

export function ScreenshotTab({ staged, onStagedChange, invalidIds }: Props) {
  const [extracting, setExtracting] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    setExtracting(true);
    setLastResult(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/ai/extract-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setLastResult({ count: 0, error: data.error ?? "Extraction failed" });
        return;
      }

      const transactions: StagedExpense[] = data.transactions ?? [];
      if (transactions.length === 0) {
        setLastResult({ count: 0, error: "No transactions found in this image." });
      } else {
        onStagedChange([...staged, ...transactions]);
        setLastResult({ count: transactions.length });
      }
    } catch {
      setLastResult({ count: 0, error: "Network error — please try again." });
    } finally {
      setExtracting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !extracting && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={extracting}
        />
        {extracting ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Extracting transactions…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageUp className="h-8 w-8" />
            <span className="text-sm font-medium">Drop a screenshot here or click to upload</span>
            <span className="text-xs">Bank statements, credit card screenshots, receipts</span>
          </div>
        )}
      </div>

      {/* Extraction result feedback */}
      {lastResult && (
        <div
          className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
            lastResult.error
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {lastResult.error ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>
            {lastResult.error
              ? lastResult.error
              : `Extracted ${lastResult.count} transaction${lastResult.count !== 1 ? "s" : ""}. Review below before adding.`}
          </span>
        </div>
      )}

      {/* Staged rows from screenshots */}
      {staged.length > 0 && (
        <StagingTable rows={staged} onChange={onStagedChange} invalidIds={invalidIds} />
      )}

      <p className="text-xs text-muted-foreground">
        Upload multiple screenshots — results are accumulated in the table above.
      </p>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:image/png;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
