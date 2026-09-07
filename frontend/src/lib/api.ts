import axios, { AxiosError } from "axios";
import type {
  AnalyticsSummary,
  BacktestingResults,
  BatchResult,
  FeatureImportanceItem,
  HealthStatus,
  HospitalListResponse,
  HospitalPenaltyInput,
  HospitalPenaltyResult,
  HospitalProfile,
  InterventionRequest,
  InterventionResult,
  ModelInfo,
  PatientReadmissionInput,
  PatientReadmissionResult,
  PenaltiesByOwnershipItem,
  PenaltiesByStateItem,
  ReadmissionBenchmarkItem,
  SimilarHospital,
} from "@/lib/types";
import {
  DEMO_BACKTESTING,
  DEMO_BENCHMARKS,
  DEMO_FEATURE_IMPORTANCE,
  DEMO_HEALTH,
  DEMO_HOSPITAL_PROFILE,
  DEMO_MODEL_INFO,
  DEMO_OWNERSHIP,
  demoHospitalList,
  demoHospitalPenalty,
  demoIntervention,
  demoPatientReadmission,
  DEMO_STATES,
  DEMO_SUMMARY,
} from "@/lib/demoData";

const _apiRoot =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

// All versioned API calls go to /api/v1/. Health check stays at root.
const baseURL = `${_apiRoot}/api/v1`;
export const healthURL = `${_apiRoot}/health`;

/** Global flag flipped to true whenever the API is unreachable and demo data is served. */
export let isDemoMode = false;

type DemoListener = (isDemo: boolean) => void;
const demoListeners = new Set<DemoListener>();

export function onDemoModeChange(listener: DemoListener): () => void {
  demoListeners.add(listener);
  return () => demoListeners.delete(listener);
}

function setDemoMode(value: boolean): void {
  if (isDemoMode !== value) {
    isDemoMode = value;
    if (value) {
      console.warn(
        "[Regate] DEMO MODE ACTIVE — API is unreachable. All data shown is static demo data, not live hospital records."
      );
    }
    demoListeners.forEach((l) => l(value));
  }
}

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const message = status
      ? `Request failed with status ${status}`
      : error.message || "Network error";
    // eslint-disable-next-line no-console
    console.error(`[Regate API] ${error.config?.method?.toUpperCase()} ${error.config?.url} — ${message}`);
    return Promise.reject(new Error(message));
  },
);

async function withFallback<T>(request: () => Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    const { data } = await request();
    setDemoMode(false);
    return data;
  } catch {
    setDemoMode(true);
    return fallback;
  }
}

// ---- Health ----
export function getHealth(): Promise<HealthStatus> {
  return withFallback(() => axios.get<HealthStatus>(healthURL, { timeout: 12000 }), DEMO_HEALTH);
}

// ---- Analytics ----
export function getSummary(): Promise<AnalyticsSummary> {
  return withFallback(() => api.get<AnalyticsSummary>("/analytics/summary"), DEMO_SUMMARY);
}

export function getPenaltiesByState(): Promise<PenaltiesByStateItem[]> {
  return withFallback(
    () => api.get<PenaltiesByStateItem[]>("/analytics/penalties-by-state"),
    DEMO_STATES,
  );
}

export function getPenaltiesByOwnership(): Promise<PenaltiesByOwnershipItem[]> {
  return withFallback(
    () => api.get<PenaltiesByOwnershipItem[]>("/analytics/penalties-by-ownership"),
    DEMO_OWNERSHIP,
  );
}

export function getFeatureImportance(): Promise<FeatureImportanceItem[]> {
  return withFallback(
    () => api.get<FeatureImportanceItem[]>("/analytics/feature-importance"),
    DEMO_FEATURE_IMPORTANCE,
  );
}

export function getReadmissionBenchmarks(): Promise<ReadmissionBenchmarkItem[]> {
  return withFallback(
    () => api.get<ReadmissionBenchmarkItem[]>("/analytics/readmission-benchmarks"),
    DEMO_BENCHMARKS,
  );
}

export function getBacktesting(): Promise<BacktestingResults> {
  return withFallback(
    () => api.get<BacktestingResults>("/analytics/backtesting"),
    DEMO_BACKTESTING,
  );
}

export function getModelInfo(): Promise<ModelInfo> {
  return withFallback(() => api.get<ModelInfo>("/analytics/model-info"), DEMO_MODEL_INFO);
}

// ---- Hospitals ----
export interface HospitalQuery {
  q?: string;
  state?: string;
  ownership?: string;
  penalized?: boolean;
  min_stars?: number;
  max_stars?: number;
  risk_tier?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export function getHospitals(params: HospitalQuery = {}): Promise<HospitalListResponse> {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null),
  );
  return withFallback(
    () => api.get<HospitalListResponse>("/hospitals", { params: clean }),
    demoHospitalList(params),
  );
}

export function getHospital(providerId: string): Promise<HospitalProfile> {
  return withFallback(
    () => api.get<HospitalProfile>(`/hospitals/${providerId}`),
    DEMO_HOSPITAL_PROFILE,
  );
}

export function getSimilarHospitals(
  providerId: string,
): Promise<{ provider_id: string; similar: SimilarHospital[] }> {
  return withFallback(
    () => api.get<{ provider_id: string; similar: SimilarHospital[] }>(`/hospitals/${providerId}/similar`),
    { provider_id: providerId, similar: [] },
  );
}

// ---- Predictions ----
export function predictHospitalPenalty(input: HospitalPenaltyInput): Promise<HospitalPenaltyResult> {
  return withFallback(
    () => api.post<HospitalPenaltyResult>("/predict/hospital-penalty", input),
    demoHospitalPenalty(input),
  );
}

export function predictPatientReadmission(
  input: PatientReadmissionInput,
): Promise<PatientReadmissionResult> {
  return withFallback(
    () => api.post<PatientReadmissionResult>("/predict/patient-readmission", input),
    demoPatientReadmission(input),
  );
}

export function simulateIntervention(body: InterventionRequest): Promise<InterventionResult> {
  return withFallback(
    () => api.post<InterventionResult>("/predict/intervention-simulation", body),
    demoIntervention(body),
  );
}

// ---- Batch ----
export function analyzeBatch(providerIds: string[]): Promise<BatchResult> {
  const fallback: BatchResult = {
    total_submitted: providerIds.length,
    found: 0,
    not_found: providerIds,
    portfolio_summary: {
      total_hospitals: 0,
      penalized_count: 0,
      avg_penalty_pct: 0,
      total_estimated_penalties_usd: 0,
      highest_risk: null,
      lowest_risk: null,
    },
    hospitals: [],
  };
  return withFallback(
    () => api.post<BatchResult>("/batch/analyze", { provider_ids: providerIds }),
    fallback,
  );
}

// ---- Export ----
export function hospitalCsvUrl(providerId: string): string {
  return `${baseURL}/export/hospital/${providerId}/csv`;
}

export function hospitalPdfUrl(providerId: string): string {
  return `${baseURL}/export/hospital/${providerId}/pdf`;
}

export async function downloadExport(providerId: string, format: "csv" | "pdf"): Promise<void> {
  try {
    const url = format === "csv" ? hospitalCsvUrl(providerId) : hospitalPdfUrl(providerId);
    const response = await api.get(url, { responseType: "blob", baseURL: "" });
    const blob = new Blob([response.data], {
      type: format === "csv" ? "text/csv" : "application/pdf",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `hospital_${providerId}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch {
    throw new Error(`Export unavailable — please ensure the backend is running and try again.`);
  }
}
