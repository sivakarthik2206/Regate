"use client";

import React, { useState } from "react";
import { ApiPenaltiesByStateItem } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";

interface StatesTableProps {
  data: ApiPenaltiesByStateItem[];
}

export function StatesTable({ data }: StatesTableProps): JSX.Element {
  const [sortField, setSortField] = useState<keyof ApiPenaltiesByStateItem>("penalty_rate");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: keyof ApiPenaltiesByStateItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = React.useMemo(() => {
    return [...data]
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;

        if (typeof valA === "string") {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }

        return sortAsc
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      })
      .slice(0, 10);
  }, [data, sortField, sortAsc]);

  const getBadgeClass = (rate: number) => {
    const pct = rate * 100;
    if (pct > 30) {
      return "border-risk-red/20 bg-risk-red/10 text-risk-red shadow-[0_0_12px_rgba(255,77,109,0.15)]";
    } else if (pct >= 20) {
      return "border-amber/20 bg-amber/10 text-amber shadow-[0_0_12px_rgba(247,168,0,0.15)]";
    } else {
      return "border-safe-green/20 bg-safe-green/10 text-safe-green shadow-[0_0_12px_rgba(0,200,150,0.15)]";
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-[28px] border border-white/8 bg-card-900 p-6 shadow-lg">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-white">Top Penalized States</h3>
        <p className="text-xs text-white/50">States ranked by penalty frequency (CMS records)</p>
      </div>

      <div className="mt-4 flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs font-semibold text-white/40 uppercase tracking-wider">
              <th
                onClick={() => handleSort("state")}
                className="py-3 px-2 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  State <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("penalized_count")}
                className="py-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Penalized <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_count")}
                className="py-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Total <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("penalty_rate")}
                className="py-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Rate % <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("avg_penalty_pct")}
                className="py-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Penalty % <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-white/80">
            {sortedData.map((row) => (
              <tr key={row.state} className="hover:bg-white/2 transition-colors">
                <td className="py-2.5 px-2 font-semibold text-white">{row.state}</td>
                <td className="py-2.5 px-2 text-right font-mono">{row.penalized_count}</td>
                <td className="py-2.5 px-2 text-right font-mono text-white/55">{row.total_count}</td>
                <td className="py-2.5 px-2 text-right font-mono">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getBadgeClass(row.penalty_rate)}`}>
                    {(row.penalty_rate * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-white/60">
                  {row.avg_penalty_pct ? `${(row.avg_penalty_pct * 100).toFixed(1)}%` : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
