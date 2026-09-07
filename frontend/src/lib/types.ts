// Mirrors the Regate FastAPI backend schemas.

export type RiskTierLabel = "No Risk" | "Low Risk" | "Medium Risk" | "High Risk";
export type PatientRiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type Impact = "High" | "Medium" | "Low";

export interface HealthStatus {
  status: string;
  models_loaded: boolean;
  hospitals_in_database: number;
  data_last_updated: string;
  predictions_apply_to: string;
  cms_performance_period: string;
}

// ---- Analytics ----

export interface SummaryConditionItem {
  condition: string;
  avg_excess_ratio: number | null;
  hospitals_affected: number;
}

export interface AnalyticsSummary {
  total_hospitals: number;
  total_penalized: number;
  penalty_rate_pct: number;
  avg_penalty_pct: number;
  median_penalty_pct: number;
  estimated_total_penalties_usd: number;
  penalties_by_condition: SummaryConditionItem[];
  data_last_updated: string;
  predictions_apply_to: string;
  cms_performance_period: string;
}

export interface PenaltiesByStateItem {
  state: string;
  state_name: string;
  penalized_count: number;
  total_count: number;
  penalty_rate_pct: number;
  avg_penalty_pct: number;
  top_condition: string | null;
}

export interface PenaltiesByOwnershipItem {
  ownership_type: string;
  penalized_count: number;
  total_count: number;
  penalty_rate_pct: number;
  avg_penalty_pct: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  label: string;
  description: string;
}

export interface ReadmissionBenchmarkItem {
  condition: string;
  condition_full_name: string;
  national_avg: number;
  penalized_avg: number | null;
  safe_avg: number | null;
  median: number;
  p25: number;
  p75: number;
}

export interface BacktestSample {
  provider_id: string | null;
  hospital_name: string | null;
  state: string | null;
  predicted_penalized: boolean;
  actually_penalized: boolean;
  predicted_probability: number | null;
  actual_penalty_pct: number | null;
  correct: boolean;
}

export interface BacktestingResults {
  total_hospitals_tested: number;
  correctly_predicted_penalized: number;
  correctly_predicted_safe: number;
  false_positives: number;
  false_negatives: number;
  accuracy_pct: number;
  precision_pct: number;
  recall_pct: number;
  f1_pct: number;
  auc_roc: number;
  sample_predictions: BacktestSample[];
}

export interface ClassificationReportRow {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelInfo {
  metadata: Record<string, unknown>;
  training_data_sources: { dataset: string; records: number }[];
  model_type: string;
  hyperparameters: Record<string, number>;
  feature_count: number;
  feature_names: string[];
  confusion_matrix: number[][];
  classification_report: {
    not_penalized: ClassificationReportRow;
    penalized: ClassificationReportRow;
  };
}

// ---- Hospitals ----

export interface HospitalSummaryRow {
  provider_id: string | null;
  name: string | null;
  city: string | null;
  state: string | null;
  ownership_type: string | null;
  star_rating: number | null;
  penalized: boolean;
  penalty_pct: number | null;
  penalty_tier: string | null;
  risk_score: number | null;
  risk_tier: string | null;
  top_risk_condition: string | null;
}

export interface HospitalListResponse {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  hospitals: HospitalSummaryRow[];
}

export interface ConditionBreakdownItem {
  condition: string;
  condition_name: string;
  readmission_rate: number | null;
  national_avg: number | null;
  compared_to_national: string;
  excess_readmission_ratio: number | null;
  risk_contribution_pct: number;
}

export interface ProfileRiskFactor {
  factor: string;
  impact: Impact;
  value: number | boolean;
  description: string;
}

export interface PeerComparison {
  peer_group: string;
  peer_count: number;
  percentile: number;
  peer_avg_penalty_pct: number;
  peer_avg_readmission_rate: number;
}

export interface HospitalProfile {
  provider_id: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  phone: string | null;
  hospital_type: string | null;
  ownership_type: string | null;
  emergency_services: boolean;
  star_rating: number | null;
  penalized: boolean;
  penalty_pct: number | null;
  penalty_tier: string | null;
  risk_score: number | null;
  risk_tier: string | null;
  estimated_penalty_usd: number;
  cms_compare_url: string;
  condition_breakdown: ConditionBreakdownItem[];
  risk_factors: ProfileRiskFactor[];
  recommendations: string[];
  peer_comparison: PeerComparison;
  historical_trend: { fiscal_year: string; penalized: boolean; penalty_pct: number | null }[];
}

export interface SimilarHospital {
  provider_id: string | null;
  name: string | null;
  state: string | null;
  penalty_pct: number | null;
  risk_score: number | null;
}

// ---- Predictions ----

export interface HospitalPenaltyInput {
  avg_readmission_rate: number;
  conditions_above_national?: number;
  has_emergency_services?: boolean;
  ownership_type?: string | null;
  star_rating?: number | null;
  ami_readmission_rate?: number | null;
  hf_readmission_rate?: number | null;
  pneumonia_readmission_rate?: number | null;
  copd_readmission_rate?: number | null;
  hip_knee_readmission_rate?: number | null;
  cabg_readmission_rate?: number | null;
}

export interface PredictionRiskFactor {
  factor: string;
  label: string;
  impact: Impact;
  value: number | boolean;
  national_avg?: number;
  gap?: number;
}

export interface HospitalPenaltyResult {
  penalty_probability: number;
  penalty_tier: RiskTierLabel;
  estimated_penalty_pct: number;
  estimated_dollar_impact: number;
  estimated_confidence_interval: { lower: number; upper: number };
  ci_method: string;
  top_risk_factors: PredictionRiskFactor[];
  recommendations: string[];
  comparable_hospitals: number;
  data_notes: string;
}

export interface PatientReadmissionInput {
  age?: number;
  time_in_hospital?: number;
  num_medications?: number;
  number_diagnoses?: number;
  num_lab_procedures?: number;
  num_procedures?: number;
  a1c_result?: string;
  insulin?: string;
  diabetes_med?: boolean | string;
}

export interface PatientRiskFactor {
  factor: string;
  label: string;
  impact: Impact;
  value: number;
}

export interface PatientReadmissionResult {
  readmission_probability: number;
  risk_level: PatientRiskLevel;
  estimated_cost_if_readmitted: number;
  top_risk_factors: PatientRiskFactor[];
  recommended_interventions: string[];
  risk_percentile: number;
}

// ---- Intervention simulation ----

export interface InterventionItem {
  condition: string;
  reduction_pct: number;
}

export interface InterventionRequest {
  provider_id?: string | null;
  baseline?: Record<string, unknown> | null;
  interventions: InterventionItem[];
}

export interface WhatIfPrediction {
  penalty_probability: number;
  penalty_tier: RiskTierLabel;
  estimated_penalty_pct: number;
  estimated_dollar_impact: number;
}

export interface InterventionResult {
  before: WhatIfPrediction;
  after: WhatIfPrediction;
  improvement: {
    probability_reduction: number;
    dollar_savings: number;
    tier_change: string;
  };
  interventions_applied: {
    condition: string;
    original_rate: number;
    new_rate: number;
    reduction_pct: number;
  }[];
}

// ---- Batch ----

export interface BatchHospital {
  provider_id: string;
  name: string | null;
  state: string | null;
  risk_score: number | null;
  risk_tier: string | null;
  penalty_pct: number | null;
  estimated_penalty_usd: number;
  top_risk_condition: string | null;
}

export interface BatchResult {
  total_submitted: number;
  found: number;
  not_found: string[];
  portfolio_summary: {
    total_hospitals: number;
    penalized_count: number;
    avg_penalty_pct: number;
    total_estimated_penalties_usd: number;
    highest_risk: { provider_id: string; name: string | null; risk_score: number | null } | null;
    lowest_risk: { provider_id: string; name: string | null; risk_score: number | null } | null;
  };
  hospitals: BatchHospital[];
}
