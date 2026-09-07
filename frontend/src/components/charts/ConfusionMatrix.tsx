"use client";

import { cn } from "@/lib/utils";

interface ConfusionMatrixProps {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

interface CellDef {
  label: string;
  count: number;
  tone: "safe" | "amber" | "risk";
}

const TONE: Record<CellDef["tone"], string> = {
  safe: "border-safe/40 bg-safe/10 text-safe-light",
  amber: "border-amber/40 bg-amber/10 text-amber-light",
  risk: "border-risk/40 bg-risk/10 text-risk-light",
};

export function ConfusionMatrix({
  truePositive,
  trueNegative,
  falsePositive,
  falseNegative,
}: ConfusionMatrixProps) {
  const total = truePositive + trueNegative + falsePositive + falseNegative || 1;

  // Grid order: rows = actual, cols = predicted.
  const cells: CellDef[] = [
    { label: "True Positive", count: truePositive, tone: "safe" },
    { label: "False Negative", count: falseNegative, tone: "risk" },
    { label: "False Positive", count: falsePositive, tone: "amber" },
    { label: "True Negative", count: trueNegative, tone: "safe" },
  ];

  return (
    <div>
      {/* Column headers */}
      <div className="mb-2 grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span />
        <span>Predicted Penalized</span>
        <span>Predicted Safe</span>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <RowLabel>Actual Penalized</RowLabel>
        <Cell cell={cells[0]} total={total} />
        <Cell cell={cells[1]} total={total} />

        <RowLabel>Actual Safe</RowLabel>
        <Cell cell={cells[2]} total={total} />
        <Cell cell={cells[3]} total={total} />
      </div>
    </div>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex w-24 items-center text-right text-[10px] font-semibold uppercase leading-tight tracking-wider text-slate-500">
      {children}
    </span>
  );
}

function Cell({ cell, total }: { cell: CellDef; total: number }) {
  const pct = (cell.count / total) * 100;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-3 py-5 text-center",
        TONE[cell.tone],
      )}
    >
      <span className="font-display text-3xl font-bold tabular-nums">{cell.count}</span>
      <span className="mt-1 text-xs opacity-80">{pct.toFixed(1)}%</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {cell.label}
      </span>
    </div>
  );
}
