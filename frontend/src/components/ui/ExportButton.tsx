"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Table2 } from "lucide-react";
import { downloadExport } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  providerId: string;
  format: "csv" | "pdf";
  className?: string;
  label?: string;
}

export function ExportButton({ providerId, format, className, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handle = async () => {
    setLoading(true);
    setError(false);
    try {
      await downloadExport(providerId, format);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const Icon = format === "csv" ? Table2 : FileText;
  const text = label ?? `Export ${format.toUpperCase()}`;

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className={cn("btn-ghost", error && "border-risk/50 text-risk-light", className)}
      aria-label={text}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : error ? (
        <Download className="h-4 w-4" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {error ? "Retry" : text}
    </button>
  );
}
