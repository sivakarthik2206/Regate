"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  accessor?: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  rowKey: (row: T, index: number) => string;
  className?: string;
  /** When true, sorting/pagination are handled by the parent (server-side). */
  manual?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  onRowClick,
  rowKey,
  className,
  manual = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (manual || !sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [data, columns, sortKey, sortDir, manual]);

  const totalPages = manual ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = manual ? sorted : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable || manual) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("desc");
    }
    setPage(1);
  };

  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-300 bg-navy-200/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => toggleSort(col)}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && !manual && "cursor-pointer select-none hover:text-cyan",
                    col.className,
                  )}
                >
                  <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                    {col.header}
                    {col.sortable && !manual && (
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-navy-300/40 transition-colors",
                  i % 2 === 1 && "bg-navy-100/40",
                  onRowClick && "cursor-pointer hover:bg-cyan/5",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-slate-200",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : String(col.accessor?.(row) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!manual && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-navy-300 px-4 py-3 text-xs text-slate-400">
          <span>
            Page {currentPage} of {totalPages} · {sorted.length} rows
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-navy-300 p-1.5 disabled:opacity-40 enabled:hover:border-cyan/50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-navy-300 p-1.5 disabled:opacity-40 enabled:hover:border-cyan/50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}
