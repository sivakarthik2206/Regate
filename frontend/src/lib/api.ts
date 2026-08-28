import axios, { AxiosError } from "axios";
import type {
  ApiHospitalListResponse,
  ApiPenaltiesByStateItem,
  ApiReadmissionRateItem,
  HospitalListItem,
  HospitalDetailResponse,
  HospitalRiskInput,
  HospitalRiskOutput,
  HospitalSearchItem,
  HospitalSummaryResponse,
  PatientRiskInput,
  PatientRiskOutput,
  PredictionFeatureImportanceItem,
} from "@/lib/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const isProduction = process.env.NODE_ENV === "production";

export let isDemoMode = false;

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error.response ? `Request failed with status ${error.response.status}` : error.message;
    return Promise.reject(new Error(message));
  },
);

export const DEMO_SUMMARY: HospitalSummaryResponse = {
  total_hospitals_analyzed: 3244,
  total_penalized: 742,
  penalty_rate_pct: 22.87,
  avg_penalty_pct: 18.4,
  estimated_total_penalties_usd: 142300000,
  conditions_by_impact: [
    { condition: "AMI", avg_readmission_rate: 19.8, hospitals_penalized: 312 },
    { condition: "HF", avg_readmission_rate: 21.4, hospitals_penalized: 410 },
  ],
  penalty_by_ownership: [
    { ownership: "Voluntary non-profit", penalty_rate: 0.22, count: 480 },
    { ownership: "Proprietary", penalty_rate: 0.26, count: 182 },
    { ownership: "Government", penalty_rate: 0.18, count: 80 },
  ],
  penalty_trend_note: "Slight upward shift in COPD readmission rates nationwide.",
};

export const DEMO_PENALTIES_BY_STATE: ApiPenaltiesByStateItem[] = [
  { state: "CA", penalized_count: 84, total_count: 320, avg_penalty_pct: 0.182, penalty_rate: 0.2625 },
  { state: "TX", penalized_count: 72, total_count: 280, avg_penalty_pct: 0.191, penalty_rate: 0.2571 },
  { state: "FL", penalized_count: 65, total_count: 198, avg_penalty_pct: 0.213, penalty_rate: 0.3283 },
  { state: "NY", penalized_count: 58, total_count: 160, avg_penalty_pct: 0.224, penalty_rate: 0.3625 },
  { state: "IL", penalized_count: 42, total_count: 150, avg_penalty_pct: 0.175, penalty_rate: 0.28 },
  { state: "OH", penalized_count: 38, total_count: 142, avg_penalty_pct: 0.168, penalty_rate: 0.2676 },
  { state: "PA", penalized_count: 35, total_count: 135, avg_penalty_pct: 0.179, penalty_rate: 0.2593 },
  { state: "GA", penalized_count: 31, total_count: 110, avg_penalty_pct: 0.185, penalty_rate: 0.2818 },
  { state: "NC", penalized_count: 28, total_count: 105, avg_penalty_pct: 0.192, penalty_rate: 0.2667 },
  { state: "MI", penalized_count: 25, total_count: 98, avg_penalty_pct: 0.171, penalty_rate: 0.2551 },
];

export const DEMO_FEATURE_IMPORTANCE: PredictionFeatureImportanceItem[] = [
  { feature: "avg_readmission_rate", importance: 0.284, description: "Average 30-Day Readmission Rate" },
  { feature: "conditions_above_national", importance: 0.241, description: "Conditions Exceeding National Avg" },
  { feature: "star_rating", importance: 0.183, description: "CMS Star Rating" },
  { feature: "copd_readmission_rate", importance: 0.098, description: "COPD Readmission Rate" },
  { feature: "ami_readmission_rate", importance: 0.082, description: "AMI Readmission Rate" },
  { feature: "hf_readmission_rate", importance: 0.071, description: "Heart Failure Readmission Rate" },
  { feature: "pneumonia_readmission_rate", importance: 0.041, description: "Pneumonia Readmission Rate" },
];

export const DEMO_READMISSION_RATES: ApiReadmissionRateItem[] = [
  { condition: "AMI", national_avg: 17.2, penalized_avg: 21.3, safe_avg: 16.1 },
  { condition: "HF", national_avg: 21.1, penalized_avg: 24.8, safe_avg: 19.8 },
  { condition: "PN", national_avg: 16.5, penalized_avg: 19.9, safe_avg: 15.3 },
  { condition: "COPD", national_avg: 19.2, penalized_avg: 22.7, safe_avg: 18.0 },
  { condition: "HIP_KNEE", national_avg: 4.8, penalized_avg: 6.9, safe_avg: 4.1 },
  { condition: "CABG", national_avg: 12.5, penalized_avg: 15.4, safe_avg: 11.2 },
];

const DEMO_HOSPITALS: HospitalDetailResponse[] = [
  {
    provider_id: "100001",
    name: "REGATE GENERAL HOSPITAL",
    city: "Dallas",
    state: "TX",
    ownership_type: "Voluntary non-profit",
    star_rating: 4,
    penalized: 0,
    penalty_pct: null,
    penalty_tier: 0,
    has_emergency_services: true,
    avg_readmission_rate: 17.6,
    ami_readmission_rate: 16.8,
    hf_readmission_rate: 19.4,
    pneumonia_readmission_rate: 15.2,
    copd_readmission_rate: 18.1,
    hip_knee_readmission_rate: 4.6,
    cabg_readmission_rate: 11.9,
  },
  {
    provider_id: "100002",
    name: "METRO MEDICAL CENTER",
    city: "Phoenix",
    state: "AZ",
    ownership_type: "Proprietary",
    star_rating: 2,
    penalized: 1,
    penalty_pct: 0.024,
    penalty_tier: 1,
    has_emergency_services: true,
    avg_readmission_rate: 22.8,
    ami_readmission_rate: 24.9,
    hf_readmission_rate: 25.6,
    pneumonia_readmission_rate: 20.3,
    copd_readmission_rate: 23.4,
    hip_knee_readmission_rate: 6.2,
    cabg_readmission_rate: 15.1,
  },
  {
    provider_id: "100003",
    name: "COUNTY HEALTH SYSTEM",
    city: "Columbus",
    state: "OH",
    ownership_type: "Government",
    star_rating: 3,
    penalized: 1,
    penalty_pct: 0.018,
    penalty_tier: 1,
    has_emergency_services: true,
    avg_readmission_rate: 19.4,
    ami_readmission_rate: 20.2,
    hf_readmission_rate: 22.1,
    pneumonia_readmission_rate: 17.4,
    copd_readmission_rate: 19.9,
    hip_knee_readmission_rate: 5.4,
    cabg_readmission_rate: 13.8,
  },
  {
    provider_id: "100004",
    name: "LAKESIDE COMMUNITY HOSPITAL",
    city: "Orlando",
    state: "FL",
    ownership_type: "Voluntary non-profit",
    star_rating: 5,
    penalized: 0,
    penalty_pct: null,
    penalty_tier: 0,
    has_emergency_services: false,
    avg_readmission_rate: 15.2,
    ami_readmission_rate: 14.9,
    hf_readmission_rate: 16.7,
    pneumonia_readmission_rate: 13.8,
    copd_readmission_rate: 15.6,
    hip_knee_readmission_rate: 4.0,
    cabg_readmission_rate: 10.8,
  },
];

export async function getSummary(): Promise<HospitalSummaryResponse> {
  return requestWithFallback(
    () => api.get<HospitalSummaryResponse>("/analytics/summary"),
    DEMO_SUMMARY,
  );
}

export async function getPenaltiesByState(): Promise<ApiPenaltiesByStateItem[]> {
  return requestWithFallback(
    () => api.get<ApiPenaltiesByStateItem[]>("/analytics/penalties-by-state"),
    DEMO_PENALTIES_BY_STATE,
  );
}

export async function getFeatureImportance(): Promise<PredictionFeatureImportanceItem[]> {
  return requestWithFallback(
    () => api.get<PredictionFeatureImportanceItem[]>("/analytics/feature-importance"),
    DEMO_FEATURE_IMPORTANCE,
  );
}

export async function getReadmissionRates(): Promise<ApiReadmissionRateItem[]> {
  return requestWithFallback(
    () => api.get<ApiReadmissionRateItem[]>("/analytics/readmission-rates"),
    DEMO_READMISSION_RATES,
  );
}

export async function getHospitals(params?: {
  state?: string;
  penalized?: boolean;
  min_stars?: number;
  page?: number;
  page_size?: number;
}): Promise<ApiHospitalListResponse> {
  return requestWithFallback(
    () => api.get<ApiHospitalListResponse>("/hospitals", { params }),
    demoHospitalList(params),
  );
}

export async function getHospital(id: string): Promise<HospitalDetailResponse> {
  return requestWithFallback(
    () => api.get<HospitalDetailResponse>(`/hospitals/${id}`),
    demoHospitalById(id),
  );
}

export async function searchHospitals(q: string): Promise<HospitalSearchItem[]> {
  return requestWithFallback(
    () => api.get<HospitalSearchItem[]>("/hospitals/search", { params: { q } }),
    demoHospitalSearch(q),
  );
}

export async function predictHospitalPenalty(input: HospitalRiskInput): Promise<HospitalRiskOutput> {
  return requestWithFallback(
    () => api.post<HospitalRiskOutput>("/predict/hospital-penalty", input),
    {
      penalty_probability: 0.82,
      penalty_tier: "High Risk",
      estimated_penalty_pct: 1.25,
      estimated_dollar_impact: 625_000,
      top_risk_factors: [
        { factor: "conditions_above_national", impact: "high", value: input.conditions_above_national },
        { factor: "avg_readmission_rate", impact: "high", value: input.avg_readmission_rate },
        { factor: "star_rating", impact: "medium", value: input.star_rating ?? null },
      ],
      recommendations: [
        "Reduce condition-specific readmissions through discharge bundles.",
        "Prioritize high-risk patient navigation within 7 days post-discharge.",
        "Review coding and care transition workflows.",
      ],
    },
  );
}

export async function predictPatientReadmission(input: PatientRiskInput): Promise<PatientRiskOutput> {
  return requestWithFallback(
    () => api.post<PatientRiskOutput>("/predict/patient-readmission", input),
    {
      readmission_probability: 0.67,
      risk_level: "High",
      top_risk_factors: [
        { factor: "time_in_hospital", impact: "high", value: input.time_in_hospital },
        { factor: "num_medications", impact: "high", value: input.num_medications },
        { factor: "number_diagnoses", impact: "medium", value: input.number_diagnoses },
      ],
      recommended_interventions: [
        "Schedule follow-up within 7 days.",
        "Perform medication reconciliation before discharge.",
        "Provide diabetes self-management education.",
      ],
      estimated_cost_if_readmitted: 15_200,
    },
  );
}

export async function getDemoHospitalPrediction(): Promise<HospitalRiskOutput> {
  return requestWithFallback(
    () => api.get<HospitalRiskOutput>("/predict/hospital-penalty/demo"),
    {
      penalty_probability: 0.82,
      penalty_tier: "High Risk",
      estimated_penalty_pct: 1.25,
      estimated_dollar_impact: 625_000,
      top_risk_factors: [
        { factor: "conditions_above_national", impact: "high", value: 5 },
        { factor: "avg_readmission_rate", impact: "high", value: 24.8 },
        { factor: "star_rating", impact: "medium", value: 2 },
      ],
      recommendations: [
        "Reduce condition-specific readmissions through discharge bundles.",
        "Prioritize high-risk patient navigation within 7 days post-discharge.",
        "Review coding and care transition workflows.",
      ],
    },
  );
}

export async function getDemoPatientPrediction(): Promise<PatientRiskOutput> {
  return requestWithFallback(
    () => api.get<PatientRiskOutput>("/predict/patient-readmission/demo"),
    {
      readmission_probability: 0.67,
      risk_level: "High",
      top_risk_factors: [
        { factor: "time_in_hospital", impact: "high", value: 8 },
        { factor: "num_medications", impact: "high", value: 18 },
        { factor: "number_diagnoses", impact: "medium", value: 9 },
      ],
      recommended_interventions: [
        "Schedule follow-up within 7 days.",
        "Perform medication reconciliation before discharge.",
        "Provide diabetes self-management education.",
      ],
      estimated_cost_if_readmitted: 15_200,
    },
  );
}

async function requestWithFallback<T>(request: () => Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    const response = await request();
    if (isDemoMode) {
      isDemoMode = false;
    }
    return response.data;
  } catch (error) {
    if (!isProduction) {
      throw error;
    }
    isDemoMode = true;
    return fallback;
  }
}

function demoHospitalList(params?: { state?: string; penalized?: boolean; min_stars?: number; page?: number; page_size?: number }): ApiHospitalListResponse {
  const filtered = DEMO_HOSPITALS.filter((hospital) => {
    const starRating = numberOrNull(hospital.star_rating) ?? 0;
    if (params?.state && hospital.state !== params.state) return false;
    if (params?.penalized === true && !(hospital.penalty_pct !== null || hospital.penalized === 1)) return false;
    if (params?.penalized === false && hospital.penalty_pct !== null) return false;
    if (typeof params?.min_stars === "number" && starRating < params.min_stars) return false;
    return true;
  });
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? 20;
  const start = (page - 1) * pageSize;
  return {
    page,
    page_size: pageSize,
    total: filtered.length,
    items: filtered.slice(start, start + pageSize).map(toListItem),
  };
}

function demoHospitalById(id: string): HospitalDetailResponse {
  return DEMO_HOSPITALS.find((hospital) => hospital.provider_id === id) ?? DEMO_HOSPITALS[0];
}

function demoHospitalSearch(q: string): HospitalSearchItem[] {
  const query = q.trim().toLowerCase();
  if (!query) {
    return DEMO_HOSPITALS.slice(0, 4).map(toSearchItem);
  }
  return DEMO_HOSPITALS.filter((hospital) => {
    const name = stringValue(hospital.name).toLowerCase();
    const city = stringValue(hospital.city).toLowerCase();
    const state = stringValue(hospital.state).toLowerCase();
    return name.includes(query) || city.includes(query) || state.includes(query);
  }).map(toSearchItem);
}

function toListItem(hospital: HospitalDetailResponse): HospitalListItem {
  return {
    provider_id: stringValue(hospital.provider_id),
    name: stringValue(hospital.name),
    city: stringValue(hospital.city),
    state: stringValue(hospital.state),
    ownership_type: stringValue(hospital.ownership_type),
    star_rating: numberOrNull(hospital.star_rating),
    penalized: typeof hospital.penalized === "number" ? hospital.penalized : hospital.penalty_pct !== null ? 1 : 0,
    penalty_pct: numberOrNull(hospital.penalty_pct),
    penalty_tier: numberOrNull(hospital.penalty_tier),
  };
}

function toSearchItem(hospital: HospitalDetailResponse): HospitalSearchItem {
  return {
    provider_id: stringValue(hospital.provider_id),
    name: stringValue(hospital.name),
    city: stringValue(hospital.city),
    state: stringValue(hospital.state),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
