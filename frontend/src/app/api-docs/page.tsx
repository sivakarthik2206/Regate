"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Loader2, Play } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---- Types -----------------------------------------------------------
interface Param {
  name: string;
  in: "query" | "path" | "body";
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface EndpointDef {
  id: string;
  method: "GET" | "POST";
  path: string;
  desc: string;
  params?: Param[];
  requestBody?: string;
  exampleResponse: string;
  tryPath?: string;
}

interface Group {
  title: string;
  desc: string;
  endpoints: EndpointDef[];
}

// ---- Endpoint data ---------------------------------------------------
const GROUPS: Group[] = [
  {
    title: "Health",
    desc: "Service and model status.",
    endpoints: [
      {
        id: "health",
        method: "GET",
        path: "/health",
        desc: "Returns API health status, model load state, hospital count, and data freshness.",
        exampleResponse: JSON.stringify(
          {
            status: "ok",
            models_loaded: true,
            hospitals_in_database: 3244,
            data_last_updated: "2024-06-30",
            predictions_apply_to: "FY2027",
            cms_performance_period: "July 2021 - June 2024",
          },
          null, 2,
        ),
        tryPath: "/health",
      },
    ],
  },
  {
    title: "Analytics",
    desc: "National-level penalty statistics, state breakdowns, model metadata, and backtesting results.",
    endpoints: [
      {
        id: "analytics-summary",
        method: "GET",
        path: "/analytics/summary",
        desc: "National penalty summary including total hospitals, penalty rate, dollar estimates, and per-condition impact.",
        exampleResponse: JSON.stringify(
          {
            total_hospitals: 3244,
            total_penalized: 2273,
            penalty_rate_pct: 70.07,
            avg_penalty_pct: 0.42,
            median_penalty_pct: 0.17,
            estimated_total_penalties_usd: 320000000,
            penalties_by_condition: [
              { condition: "Heart Failure", avg_excess_ratio: 1.04, hospitals_affected: 1520 },
              { condition: "Pneumonia", avg_excess_ratio: 1.03, hospitals_affected: 1410 },
            ],
            data_last_updated: "2024-06-30",
            predictions_apply_to: "FY2027",
          },
          null, 2,
        ),
        tryPath: "/analytics/summary",
      },
      {
        id: "analytics-penalties-by-state",
        method: "GET",
        path: "/analytics/penalties-by-state",
        desc: "Penalty rate, average penalty percentage, and dominant condition for each US state.",
        exampleResponse: JSON.stringify(
          [
            {
              state: "CA",
              state_name: "California",
              penalized_count: 210,
              total_count: 300,
              penalty_rate_pct: 70.0,
              avg_penalty_pct: 0.41,
              top_condition: "Heart Failure",
            },
            {
              state: "TX",
              state_name: "Texas",
              penalized_count: 190,
              total_count: 280,
              penalty_rate_pct: 67.86,
              avg_penalty_pct: 0.44,
              top_condition: "Pneumonia",
            },
          ],
          null, 2,
        ),
        tryPath: "/analytics/penalties-by-state",
      },
      {
        id: "analytics-backtesting",
        method: "GET",
        path: "/analytics/backtesting",
        desc: "Held-out validation metrics (accuracy, precision, recall, F1, AUC-ROC) plus a sample of individual predictions.",
        exampleResponse: JSON.stringify(
          {
            total_hospitals_tested: 586,
            correctly_predicted_penalized: 341,
            correctly_predicted_safe: 55,
            false_positives: 28,
            false_negatives: 162,
            accuracy_pct: 67.58,
            precision_pct: 92.41,
            recall_pct: 67.79,
            f1_pct: 78.21,
            auc_roc: 0.7432,
            sample_predictions: [
              {
                provider_id: "330164",
                hospital_name: "HIGHLAND HOSPITAL",
                state: "NY",
                predicted_penalized: true,
                actually_penalized: true,
                predicted_probability: 0.8279,
                correct: true,
              },
            ],
          },
          null, 2,
        ),
        tryPath: "/analytics/backtesting",
      },
      {
        id: "analytics-model-info",
        method: "GET",
        path: "/analytics/model-info",
        desc: "Model metadata, hyperparameters, feature count, and full classification report.",
        exampleResponse: JSON.stringify(
          {
            model_type: "XGBoost Classifier",
            feature_count: 5,
            hyperparameters: { n_estimators: 200, max_depth: 4, learning_rate: 0.1 },
            training_data_sources: [
              { dataset: "master_hospital_features", records: 3244 },
              { dataset: "diabetic_readmit_clean", records: 101766 },
            ],
            classification_report: {
              not_penalized: { precision: 0.711, recall: 0.688, f1: 0.699 },
              penalized: { precision: 0.874, recall: 0.885, f1: 0.879 },
            },
          },
          null, 2,
        ),
        tryPath: "/analytics/model-info",
      },
    ],
  },
  {
    title: "Hospitals",
    desc: "Search, filter, and retrieve individual hospital risk profiles.",
    endpoints: [
      {
        id: "hospitals-list",
        method: "GET",
        path: "/hospitals",
        desc: "Paginated, filterable hospital directory. Supports full-text search, state filter, ownership filter, and penalty/risk-tier filters.",
        params: [
          { name: "q", in: "query", type: "string", required: false, description: "Full-text search across hospital name, city, and state.", example: "Cleveland" },
          { name: "state", in: "query", type: "string", required: false, description: "Two-letter state code.", example: "OH" },
          { name: "penalized", in: "query", type: "boolean", required: false, description: "Filter to penalized (true) or safe (false) hospitals.", example: "true" },
          { name: "ownership", in: "query", type: "string", required: false, description: "Ownership type: Proprietary, Government, Voluntary Non-profit.", example: "Proprietary" },
          { name: "min_stars", in: "query", type: "integer", required: false, description: "Minimum CMS star rating (1–5).", example: "3" },
          { name: "risk_tier", in: "query", type: "string", required: false, description: "Risk tier filter: low, medium, high.", example: "high" },
          { name: "page", in: "query", type: "integer", required: false, description: "Page number (1-based).", example: "1" },
          { name: "page_size", in: "query", type: "integer", required: false, description: "Results per page (max 100).", example: "20" },
        ],
        exampleResponse: JSON.stringify(
          {
            total_count: 3244,
            page: 1,
            page_size: 20,
            total_pages: 163,
            hospitals: [
              {
                provider_id: "100001",
                name: "Regate General Hospital",
                city: "Dallas",
                state: "TX",
                ownership_type: "Voluntary Non-profit",
                star_rating: 4,
                penalized: false,
                penalty_pct: null,
                risk_score: 0.31,
                risk_tier: "low",
              },
            ],
          },
          null, 2,
        ),
        tryPath: "/hospitals?page=1&page_size=5",
      },
      {
        id: "hospitals-detail",
        method: "GET",
        path: "/hospitals/{provider_id}",
        desc: "Full risk profile for a single hospital: condition breakdown, risk factors, peer comparison, and recommendations.",
        params: [
          { name: "provider_id", in: "path", type: "string", required: true, description: "CMS Provider ID (6-digit string).", example: "100002" },
        ],
        exampleResponse: JSON.stringify(
          {
            provider_id: "100002",
            name: "Metro Medical Center",
            city: "Phoenix",
            state: "AZ",
            penalized: true,
            penalty_pct: 0.82,
            risk_score: 0.74,
            risk_tier: "high",
            estimated_penalty_usd: 214000,
            condition_breakdown: [
              {
                condition: "HF",
                condition_name: "Heart Failure",
                readmission_rate: 23.1,
                national_avg: 21.7,
                excess_readmission_ratio: 1.06,
              },
            ],
            recommendations: ["Target Heart Failure readmissions with a post-discharge follow-up protocol."],
          },
          null, 2,
        ),
        tryPath: "/hospitals/100002",
      },
    ],
  },
  {
    title: "Predictions",
    desc: "Run the penalty and readmission risk models with custom inputs.",
    endpoints: [
      {
        id: "predict-hospital",
        method: "POST",
        path: "/predict/hospital-penalty",
        desc: "Predict penalty probability, dollar impact, and confidence interval from hospital readmission metrics.",
        params: [
          { name: "avg_readmission_rate", in: "body", type: "number", required: true, description: "Average 30-day readmission rate across tracked conditions (percent).", example: "19.5" },
          { name: "conditions_above_national", in: "body", type: "integer", required: false, description: "Number of conditions with ERR > 1.0.", example: "3" },
          { name: "star_rating", in: "body", type: "integer", required: false, description: "CMS star rating (1–5).", example: "2" },
          { name: "ownership_type", in: "body", type: "string", required: false, description: "Hospital ownership type.", example: "Proprietary" },
          { name: "has_emergency_services", in: "body", type: "boolean", required: false, description: "Whether the hospital operates an emergency department.", example: "true" },
        ],
        requestBody: JSON.stringify(
          {
            avg_readmission_rate: 19.5,
            conditions_above_national: 3,
            star_rating: 2,
            ownership_type: "Proprietary",
            has_emergency_services: true,
          },
          null, 2,
        ),
        exampleResponse: JSON.stringify(
          {
            penalty_probability: 0.83,
            penalty_tier: "High Risk",
            estimated_penalty_pct: 0.91,
            estimated_dollar_impact: 237400,
            estimated_confidence_interval: { lower: 0.71, upper: 0.92 },
            ci_method: "heuristic",
            top_risk_factors: [
              { factor: "mean_readmission_rate", label: "Mean Readmission Rate", impact: "High", value: 19.5, national_avg: 18.2, gap: 1.3 },
            ],
            recommendations: ["Implement post-discharge follow-up calls within 48 hours of discharge."],
          },
          null, 2,
        ),
      },
      {
        id: "predict-patient",
        method: "POST",
        path: "/predict/patient-readmission",
        desc: "Predict a patient's 30-day readmission probability from clinical indicators.",
        params: [
          { name: "age", in: "body", type: "integer", required: false, description: "Patient age in years.", example: "72" },
          { name: "num_medications", in: "body", type: "integer", required: false, description: "Number of medications prescribed during admission.", example: "18" },
          { name: "number_diagnoses", in: "body", type: "integer", required: false, description: "Number of diagnoses recorded.", example: "8" },
          { name: "time_in_hospital", in: "body", type: "integer", required: false, description: "Length of stay in days.", example: "6" },
          { name: "a1c_result", in: "body", type: "string", required: false, description: "HbA1c test result: None, Normal, >7, >8.", example: ">8" },
          { name: "insulin", in: "body", type: "string", required: false, description: "Insulin dosage change: No, Steady, Up, Down.", example: "Up" },
        ],
        requestBody: JSON.stringify(
          {
            age: 72,
            num_medications: 18,
            number_diagnoses: 8,
            time_in_hospital: 6,
            a1c_result: ">8",
            insulin: "Up",
          },
          null, 2,
        ),
        exampleResponse: JSON.stringify(
          {
            readmission_probability: 0.67,
            risk_level: "High",
            estimated_cost_if_readmitted: 14200,
            risk_percentile: 82,
            top_risk_factors: [
              { factor: "num_medications", label: "Medication Count", impact: "High", value: 18 },
              { factor: "number_diagnoses", label: "Diagnosis Count", impact: "High", value: 8 },
            ],
            recommended_interventions: [
              "Schedule a 48-hour post-discharge phone call.",
              "Arrange a 7-day follow-up appointment with the primary care physician.",
            ],
          },
          null, 2,
        ),
      },
      {
        id: "predict-simulation",
        method: "POST",
        path: "/predict/intervention-simulation",
        desc: "What-if simulation: model the dollar savings and probability reduction of targeted readmission interventions.",
        params: [
          { name: "provider_id", in: "body", type: "string", required: false, description: "CMS Provider ID to use as baseline. Mutually exclusive with `baseline`.", example: "100002" },
          { name: "interventions", in: "body", type: "array", required: true, description: "List of condition-level readmission reduction targets.", example: '[{"condition":"heart_failure","reduction_pct":15}]' },
        ],
        requestBody: JSON.stringify(
          {
            provider_id: "100002",
            interventions: [
              { condition: "heart_failure", reduction_pct: 15 },
              { condition: "pneumonia", reduction_pct: 10 },
            ],
          },
          null, 2,
        ),
        exampleResponse: JSON.stringify(
          {
            before: { penalty_probability: 0.83, penalty_tier: "High Risk", estimated_penalty_pct: 0.91, estimated_dollar_impact: 237400 },
            after: { penalty_probability: 0.54, penalty_tier: "Medium Risk", estimated_penalty_pct: 0.41, estimated_dollar_impact: 107000 },
            improvement: {
              probability_reduction: 0.29,
              dollar_savings: 130400,
              tier_change: "High Risk → Medium Risk",
            },
          },
          null, 2,
        ),
      },
    ],
  },
  {
    title: "Batch",
    desc: "Portfolio-level analysis for up to 50 hospitals in a single request.",
    endpoints: [
      {
        id: "batch-analyze",
        method: "POST",
        path: "/batch/analyze",
        desc: "Submit up to 50 provider IDs and receive a portfolio summary plus per-hospital risk breakdown.",
        params: [
          { name: "provider_ids", in: "body", type: "string[]", required: true, description: "Array of CMS Provider IDs (max 50).", example: '["100001","100002","100003"]' },
        ],
        requestBody: JSON.stringify({ provider_ids: ["100001", "100002", "100003"] }, null, 2),
        exampleResponse: JSON.stringify(
          {
            total_submitted: 3,
            found: 3,
            not_found: [],
            portfolio_summary: {
              total_hospitals: 3,
              penalized_count: 2,
              avg_penalty_pct: 0.41,
              total_estimated_penalties_usd: 451000,
              highest_risk: { provider_id: "100002", name: "Metro Medical Center", risk_score: 0.74 },
            },
            hospitals: [
              { provider_id: "100001", name: "Regate General Hospital", state: "TX", risk_score: 0.31, risk_tier: "low", penalty_pct: null, estimated_penalty_usd: 0 },
              { provider_id: "100002", name: "Metro Medical Center", state: "AZ", risk_score: 0.74, risk_tier: "high", penalty_pct: 0.82, estimated_penalty_usd: 214000 },
            ],
          },
          null, 2,
        ),
      },
    ],
  },
  {
    title: "Export",
    desc: "Download hospital profiles in CSV or PDF format.",
    endpoints: [
      {
        id: "export-csv",
        method: "GET",
        path: "/export/hospital/{provider_id}/csv",
        desc: "Download a full hospital risk profile as a CSV file. Returns the file as an attachment.",
        params: [
          { name: "provider_id", in: "path", type: "string", required: true, description: "CMS Provider ID.", example: "100002" },
        ],
        exampleResponse: `"field","value"\n"provider_id","100002"\n"name","Metro Medical Center"\n"state","AZ"\n"penalized","true"\n"penalty_pct","0.82"\n"risk_score","0.74"`,
      },
      {
        id: "export-pdf",
        method: "GET",
        path: "/export/hospital/{provider_id}/pdf",
        desc: "Download a formatted hospital risk report as a PDF. Returns a binary PDF file as an attachment.",
        params: [
          { name: "provider_id", in: "path", type: "string", required: true, description: "CMS Provider ID.", example: "100002" },
        ],
        exampleResponse: "Binary PDF stream — see Content-Disposition header for filename.",
      },
    ],
  },
];

// ---- Page -----------------------------------------------------------
export default function ApiDocsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Developers"
        title="API Reference"
        subtitle="Every endpoint powering Regate. All responses are JSON. No authentication required."
      />

      {/* Base URL */}
      <div className="mb-8 card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Base URL</p>
          <code className="mt-0.5 font-mono text-sm text-cyan">{BASE_URL}</code>
        </div>
        <CopyButton text={BASE_URL} />
      </div>

      <div className="space-y-12">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold text-white">{group.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{group.desc}</p>
            </div>
            <div className="space-y-4">
              {group.endpoints.map((ep) => (
                <EndpointCard key={ep.id} endpoint={ep} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ---- EndpointCard ---------------------------------------------------
function EndpointCard({ endpoint }: { endpoint: EndpointDef }) {
  const [open, setOpen] = useState(false);
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);

  const curl = buildCurl(endpoint);

  const handleTry = async () => {
    if (!endpoint.tryPath && endpoint.method === "GET") return;
    setTrying(true);
    setTryResult(null);
    try {
      const url = `${BASE_URL}${endpoint.tryPath ?? endpoint.path.replace("{provider_id}", "100002")}`;
      const opts: RequestInit =
        endpoint.method === "POST"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: endpoint.requestBody,
            }
          : { method: "GET" };
      const res = await fetch(url, opts);
      const text = await res.text();
      try {
        setTryResult(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setTryResult(text);
      }
    } catch (err) {
      setTryResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTrying(false);
    }
  };

  const bodyParams = endpoint.params?.filter((p) => p.in === "body") ?? [];
  const queryParams = endpoint.params?.filter((p) => p.in === "query") ?? [];
  const pathParams = endpoint.params?.filter((p) => p.in === "path") ?? [];

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-navy-200/30 transition-colors"
      >
        <MethodBadge method={endpoint.method} />
        <code className="flex-1 font-mono text-sm text-slate-200">{endpoint.path}</code>
        <span className="hidden text-sm text-slate-400 sm:block">{endpoint.desc}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-navy-300/60 p-4 space-y-5">
          <p className="text-sm text-slate-300">{endpoint.desc}</p>

          {/* Parameters */}
          {(pathParams.length > 0 || queryParams.length > 0 || bodyParams.length > 0) && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Parameters
              </h4>
              <div className="overflow-x-auto rounded-lg border border-navy-300/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-300/60 bg-navy-200/40 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">In</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Req.</th>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pathParams, ...queryParams, ...bodyParams].map((p) => (
                      <tr key={p.name} className="border-t border-navy-300/40">
                        <td className="px-3 py-2 font-mono text-cyan whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2 text-slate-500">{p.in}</td>
                        <td className="px-3 py-2 font-mono text-amber whitespace-nowrap">{p.type}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-risk font-semibold">yes</span>
                          ) : (
                            <span className="text-slate-600">no</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request body */}
          {endpoint.requestBody && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Example Request
                </h4>
                <CopyButton text={curl} small label="Copy cURL" />
              </div>
              <CodeBlock content={curl} lang="bash" />
            </div>
          )}

          {/* GET curl */}
          {endpoint.method === "GET" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Example Request
                </h4>
                <CopyButton text={curl} small label="Copy cURL" />
              </div>
              <CodeBlock content={curl} lang="bash" />
            </div>
          )}

          {/* Example response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Example Response
              </h4>
              <CopyButton text={endpoint.exampleResponse} small label="Copy JSON" />
            </div>
            <CodeBlock content={endpoint.exampleResponse} lang="json" />
          </div>

          {/* Try it */}
          {(endpoint.tryPath || endpoint.method === "POST") && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Live Response
                </h4>
                <button
                  type="button"
                  onClick={handleTry}
                  disabled={trying}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                    trying
                      ? "bg-navy-300 text-slate-500 cursor-not-allowed"
                      : "bg-cyan/15 text-cyan hover:bg-cyan/25",
                  )}
                >
                  {trying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {trying ? "Requesting…" : "Try it"}
                </button>
              </div>
              {tryResult && <CodeBlock content={tryResult} lang="json" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------
function buildCurl(ep: EndpointDef): string {
  const path = ep.tryPath ?? ep.path.replace("{provider_id}", "100002");
  const url = `${BASE_URL}${path}`;
  if (ep.method === "POST" && ep.requestBody) {
    const body = ep.requestBody.replace(/\n/g, " ").replace(/\s{2,}/g, " ");
    return `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  }
  return `curl "${url}"`;
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2.5 py-0.5 font-mono text-xs font-bold",
        method === "GET"
          ? "bg-safe/15 text-safe-light"
          : "bg-cyan/15 text-cyan",
      )}
    >
      {method}
    </span>
  );
}

function CodeBlock({ content, lang }: { content: string; lang: string }) {
  void lang;
  return (
    <pre className="overflow-x-auto rounded-xl border border-navy-300/60 bg-navy-200/40 p-4 text-xs leading-relaxed text-slate-300">
      <code>{content}</code>
    </pre>
  );
}

function CopyButton({
  text,
  small,
  label,
}: {
  text: string;
  small?: boolean;
  label?: string;
}) {
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
      {copied ? (
        <Check className="h-3.5 w-3.5 text-safe" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}
