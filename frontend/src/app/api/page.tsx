"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  desc: string;
  body?: string;
}

const GROUPS: { title: string; endpoints: Endpoint[] }[] = [
  {
    title: "Analytics",
    endpoints: [
      { method: "GET", path: "/analytics/summary", desc: "National penalty summary + per-condition impact." },
      { method: "GET", path: "/analytics/penalties-by-state", desc: "Penalty rate and top condition per state." },
      { method: "GET", path: "/analytics/penalties-by-ownership", desc: "Penalty rate grouped by ownership type." },
      { method: "GET", path: "/analytics/feature-importance", desc: "Model feature importances." },
      { method: "GET", path: "/analytics/readmission-benchmarks", desc: "Penalized vs safe readmission rates per condition." },
      { method: "GET", path: "/analytics/backtesting", desc: "Held-out validation metrics + sample predictions." },
      { method: "GET", path: "/analytics/model-info", desc: "Model metadata, hyperparameters, confusion matrix." },
    ],
  },
  {
    title: "Hospitals",
    endpoints: [
      { method: "GET", path: "/hospitals", desc: "Paginated, filterable hospital directory." },
      { method: "GET", path: "/hospitals/{provider_id}", desc: "Full hospital risk profile." },
      { method: "GET", path: "/hospitals/{provider_id}/similar", desc: "Comparable hospitals." },
    ],
  },
  {
    title: "Predictions",
    endpoints: [
      { method: "POST", path: "/predict/hospital-penalty", desc: "Predict penalty risk from hospital metrics.", body: '{ "avg_readmission_rate": 19.5, "conditions_above_national": 3, "star_rating": 2 }' },
      { method: "POST", path: "/predict/patient-readmission", desc: "Predict 30-day patient readmission risk.", body: '{ "age": 72, "num_medications": 18, "number_diagnoses": 8 }' },
      { method: "POST", path: "/predict/intervention-simulation", desc: "What-if simulation of readmission reductions.", body: '{ "provider_id": "100002", "interventions": [{ "condition": "heart_failure", "reduction_pct": 15 }] }' },
    ],
  },
  {
    title: "Batch & Export",
    endpoints: [
      { method: "POST", path: "/batch/analyze", desc: "Portfolio analysis for up to 50 provider IDs.", body: '{ "provider_ids": ["100001", "100002"] }' },
      { method: "GET", path: "/export/hospital/{provider_id}/csv", desc: "Download a hospital profile as CSV." },
      { method: "GET", path: "/export/hospital/{provider_id}/pdf", desc: "Download a hospital report as PDF." },
    ],
  },
];

export default function ApiPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Developers"
        title="API Reference"
        subtitle="Every endpoint powering Regate. All responses are JSON; no authentication required."
      />

      <div className="mb-6 card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Base URL</p>
          <code className="font-mono text-sm text-cyan">{BASE}</code>
        </div>
        <CopyButton text={BASE} />
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">{group.title}</h2>
            <div className="space-y-3">
              {group.endpoints.map((ep) => (
                <EndpointCard key={ep.path + ep.method} endpoint={ep} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const full = `${BASE}${endpoint.path}`;
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-bold",
            endpoint.method === "GET" ? "bg-cyan/15 text-cyan" : "bg-safe/15 text-safe-light",
          )}
        >
          {endpoint.method}
        </span>
        <code className="font-mono text-sm text-slate-200">{endpoint.path}</code>
        <CopyButton text={full} small />
      </div>
      <p className="mt-2 text-sm text-slate-400">{endpoint.desc}</p>
      {endpoint.body && (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-navy-300 bg-navy-200/50 p-3 text-xs text-slate-300">
          <code>{endpoint.body}</code>
        </pre>
      )}
    </div>
  );
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn("btn-ghost", small && "px-2 py-1 text-xs")}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-safe" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
