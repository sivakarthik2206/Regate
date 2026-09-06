// Demo/fallback data so the UI never breaks when the API is unreachable.
import type {
  AnalyticsSummary,
  BacktestingResults,
  FeatureImportanceItem,
  HealthStatus,
  HospitalListResponse,
  HospitalPenaltyInput,
  HospitalPenaltyResult,
  HospitalProfile,
  HospitalSummaryRow,
  InterventionRequest,
  InterventionResult,
  ModelInfo,
  PatientReadmissionInput,
  PatientReadmissionResult,
  PenaltiesByOwnershipItem,
  PenaltiesByStateItem,
  ReadmissionBenchmarkItem,
  RiskTierLabel,
} from "@/lib/types";
import type { HospitalQuery } from "@/lib/api";

export const DEMO_HEALTH: HealthStatus = {
  status: "ok",
  models_loaded: true,
  hospitals_in_database: 3244,
  data_last_updated: "2024-06-30",
  predictions_apply_to: "FY2027",
  cms_performance_period: "July 2021 - June 2024",
};

export const DEMO_SUMMARY: AnalyticsSummary = {
  total_hospitals: 3244,
  total_penalized: 2273,
  penalty_rate_pct: 70.07,
  avg_penalty_pct: 0.42,
  median_penalty_pct: 0.17,
  estimated_total_penalties_usd: 320_000_000,
  penalties_by_condition: [
    { condition: "Heart Failure", avg_excess_ratio: 1.04, hospitals_affected: 1520 },
    { condition: "Pneumonia", avg_excess_ratio: 1.03, hospitals_affected: 1410 },
    { condition: "COPD", avg_excess_ratio: 1.02, hospitals_affected: 1180 },
    { condition: "Acute Myocardial Infarction", avg_excess_ratio: 1.01, hospitals_affected: 890 },
    { condition: "Hip/Knee Replacement", avg_excess_ratio: 0.99, hospitals_affected: 640 },
    { condition: "Coronary Artery Bypass Grafting", avg_excess_ratio: 0.98, hospitals_affected: 410 },
  ],
  data_last_updated: "2024-06-30",
  predictions_apply_to: "FY2027",
  cms_performance_period: "July 2021 - June 2024",
};

export const DEMO_STATES: PenaltiesByStateItem[] = [
  { state: "CA", state_name: "California", penalized_count: 210, total_count: 300, penalty_rate_pct: 70.0, avg_penalty_pct: 0.41, top_condition: "Heart Failure" },
  { state: "TX", state_name: "Texas", penalized_count: 190, total_count: 280, penalty_rate_pct: 67.86, avg_penalty_pct: 0.44, top_condition: "Pneumonia" },
  { state: "FL", state_name: "Florida", penalized_count: 150, total_count: 198, penalty_rate_pct: 75.76, avg_penalty_pct: 0.52, top_condition: "COPD" },
  { state: "NY", state_name: "New York", penalized_count: 130, total_count: 160, penalty_rate_pct: 81.25, avg_penalty_pct: 0.55, top_condition: "Heart Failure" },
  { state: "IL", state_name: "Illinois", penalized_count: 100, total_count: 150, penalty_rate_pct: 66.67, avg_penalty_pct: 0.38, top_condition: "Pneumonia" },
  { state: "OH", state_name: "Ohio", penalized_count: 98, total_count: 142, penalty_rate_pct: 69.01, avg_penalty_pct: 0.36, top_condition: "COPD" },
  { state: "PA", state_name: "Pennsylvania", penalized_count: 95, total_count: 135, penalty_rate_pct: 70.37, avg_penalty_pct: 0.39, top_condition: "Heart Failure" },
  { state: "GA", state_name: "Georgia", penalized_count: 78, total_count: 110, penalty_rate_pct: 70.91, avg_penalty_pct: 0.42, top_condition: "Pneumonia" },
  { state: "NC", state_name: "North Carolina", penalized_count: 72, total_count: 105, penalty_rate_pct: 68.57, avg_penalty_pct: 0.40, top_condition: "Heart Failure" },
  { state: "MI", state_name: "Michigan", penalized_count: 66, total_count: 98, penalty_rate_pct: 67.35, avg_penalty_pct: 0.37, top_condition: "COPD" },
];

export const DEMO_OWNERSHIP: PenaltiesByOwnershipItem[] = [
  { ownership_type: "Voluntary Non-profit", penalized_count: 1180, total_count: 1620, penalty_rate_pct: 72.84, avg_penalty_pct: 0.40 },
  { ownership_type: "Proprietary", penalized_count: 640, total_count: 820, penalty_rate_pct: 78.05, avg_penalty_pct: 0.51 },
  { ownership_type: "Government", penalized_count: 380, total_count: 640, penalty_rate_pct: 59.38, avg_penalty_pct: 0.33 },
  { ownership_type: "Other", penalized_count: 73, total_count: 164, penalty_rate_pct: 44.51, avg_penalty_pct: 0.28 },
];

export const DEMO_FEATURE_IMPORTANCE: FeatureImportanceItem[] = [
  { feature: "mean_readmission_rate", importance: 0.352, label: "Mean Readmission Rate", description: "Average 30-day readmission rate across all tracked conditions" },
  { feature: "conditions_above_national", importance: 0.268, label: "Conditions Above National Avg", description: "Number of conditions where hospital performs worse than peers" },
  { feature: "star_rating_numeric", importance: 0.201, label: "Quality Star Rating", description: "CMS overall hospital quality star rating (1-5)" },
  { feature: "ownership_encoded", importance: 0.114, label: "Ownership Type", description: "Hospital ownership category (government, proprietary, non-profit)" },
  { feature: "has_emergency_services", importance: 0.065, label: "Emergency Services", description: "Whether the hospital operates an emergency department" },
];

export const DEMO_BENCHMARKS: ReadmissionBenchmarkItem[] = [
  { condition: "AMI", condition_full_name: "Acute Myocardial Infarction", national_avg: 15.6, penalized_avg: 16.4, safe_avg: 14.8, median: 15.5, p25: 14.6, p75: 16.5 },
  { condition: "HF", condition_full_name: "Heart Failure", national_avg: 21.7, penalized_avg: 22.8, safe_avg: 20.6, median: 21.6, p25: 20.4, p75: 22.9 },
  { condition: "PN", condition_full_name: "Pneumonia", national_avg: 17.0, penalized_avg: 18.1, safe_avg: 15.9, median: 16.9, p25: 15.7, p75: 18.2 },
  { condition: "COPD", condition_full_name: "Chronic Obstructive Pulmonary Disease", national_avg: 19.4, penalized_avg: 20.5, safe_avg: 18.3, median: 19.3, p25: 18.1, p75: 20.6 },
  { condition: "HK", condition_full_name: "Hip/Knee Replacement", national_avg: 4.3, penalized_avg: 4.9, safe_avg: 3.8, median: 4.2, p25: 3.6, p75: 4.9 },
  { condition: "CABG", condition_full_name: "Coronary Artery Bypass Grafting", national_avg: 12.6, penalized_avg: 13.6, safe_avg: 11.6, median: 12.5, p25: 11.4, p75: 13.7 },
];

const BACKTEST_HOSPITALS = [
  { name: "Memorial Regional Hospital",          state: "FL" },
  { name: "St. Francis Medical Center",          state: "LA" },
  { name: "Riverside Community Hospital",        state: "CA" },
  { name: "Piedmont Atlanta Hospital",           state: "GA" },
  { name: "Providence St. Vincent Medical Ctr",  state: "OR" },
  { name: "Methodist Hospital of Houston",       state: "TX" },
  { name: "Spectrum Health Butterworth Hospital",state: "MI" },
  { name: "WakeMed Raleigh Campus",              state: "NC" },
  { name: "Carolinas Medical Center",            state: "NC" },
  { name: "Adventist Health Glendale",           state: "CA" },
  { name: "UnityPoint Health Iowa Methodist",    state: "IA" },
  { name: "Mercy Hospital St. Louis",            state: "MO" },
];

export const DEMO_BACKTESTING: BacktestingResults = {
  total_hospitals_tested: 640,
  correctly_predicted_penalized: 402,
  correctly_predicted_safe: 128,
  false_positives: 58,
  false_negatives: 52,
  accuracy_pct: 82.81,
  precision_pct: 87.39,
  recall_pct: 88.6,
  f1_pct: 88.0,
  auc_roc: 0.74,
  sample_predictions: BACKTEST_HOSPITALS.map((h, i) => ({
    provider_id: `1000${(i + 10).toString().padStart(2, "0")}`,
    hospital_name: h.name,
    state: h.state,
    predicted_penalized: i % 4 !== 0,
    actually_penalized: i % 3 !== 0,
    predicted_probability: 0.9 - i * 0.03,
    actual_penalty_pct: i % 3 !== 0 ? 0.3 + i * 0.05 : 0,
    correct: (i % 4 !== 0) === (i % 3 !== 0),
  })),
};

export const DEMO_MODEL_INFO: ModelInfo = {
  metadata: { trained_on: "2024-06-30", version: "2.0.0" },
  training_data_sources: [
    { dataset: "master_hospital_features", records: 3244 },
    { dataset: "hrrp_clean", records: 3244 },
    { dataset: "diabetic_readmit_clean", records: 101766 },
  ],
  model_type: "XGBoost Classifier",
  hyperparameters: { n_estimators: 200, max_depth: 4, learning_rate: 0.1 },
  feature_count: 5,
  feature_names: [
    "Mean Readmission Rate",
    "Conditions Above National Avg",
    "Quality Star Rating",
    "Ownership Type",
    "Emergency Services",
  ],
  confusion_matrix: [
    [128, 58],
    [52, 402],
  ],
  classification_report: {
    not_penalized: { precision: 0.711, recall: 0.688, f1: 0.699, support: 186 },
    penalized: { precision: 0.874, recall: 0.885, f1: 0.879, support: 454 },
  },
};

const DEMO_ROWS: HospitalSummaryRow[] = [
  // High risk – penalized
  { provider_id: "140010", name: "Northwestern Memorial Hospital",        city: "Chicago",      state: "IL", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.68, penalty_tier: "Medium", risk_score: 0.71, risk_tier: "high",   top_risk_condition: "HF"   },
  { provider_id: "050376", name: "Cedars-Sinai Medical Center",           city: "Los Angeles",  state: "CA", ownership_type: "Voluntary Non-profit", star_rating: 4, penalized: true,  penalty_pct: 0.51, penalty_tier: "Medium", risk_score: 0.66, risk_tier: "high",   top_risk_condition: "COPD" },
  { provider_id: "100002", name: "Metro Medical Center",                  city: "Phoenix",      state: "AZ", ownership_type: "Proprietary",           star_rating: 2, penalized: true,  penalty_pct: 0.82, penalty_tier: "Medium", risk_score: 0.74, risk_tier: "high",   top_risk_condition: "COPD" },
  { provider_id: "360008", name: "Cleveland Regional Medical Center",     city: "Cleveland",    state: "OH", ownership_type: "Proprietary",           star_rating: 2, penalized: true,  penalty_pct: 1.12, penalty_tier: "High",   risk_score: 0.79, risk_tier: "high",   top_risk_condition: "HF"   },
  { provider_id: "450056", name: "Baylor St. Luke's Medical Center",      city: "Houston",      state: "TX", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.44, penalty_tier: "Medium", risk_score: 0.68, risk_tier: "high",   top_risk_condition: "PN"   },
  { provider_id: "100005", name: "Riverside Regional Medical Center",     city: "Sacramento",   state: "CA", ownership_type: "Proprietary",           star_rating: 2, penalized: true,  penalty_pct: 1.34, penalty_tier: "High",   risk_score: 0.81, risk_tier: "high",   top_risk_condition: "HF"   },
  { provider_id: "220092", name: "St. Joseph's Hospital and Medical Ctr", city: "Phoenix",      state: "AZ", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.59, penalty_tier: "Medium", risk_score: 0.67, risk_tier: "high",   top_risk_condition: "COPD" },
  // Medium risk
  { provider_id: "120046", name: "Tampa General Hospital",                city: "Tampa",        state: "FL", ownership_type: "Government",             star_rating: 3, penalized: true,  penalty_pct: 0.31, penalty_tier: "Low",    risk_score: 0.57, risk_tier: "medium", top_risk_condition: "AMI"  },
  { provider_id: "100003", name: "Grady Memorial Hospital",               city: "Atlanta",      state: "GA", ownership_type: "Government",             star_rating: 3, penalized: true,  penalty_pct: 0.41, penalty_tier: "Medium", risk_score: 0.58, risk_tier: "medium", top_risk_condition: "PN"   },
  { provider_id: "230038", name: "Henry Ford Hospital",                   city: "Detroit",      state: "MI", ownership_type: "Voluntary Non-profit", star_rating: 4, penalized: true,  penalty_pct: 0.24, penalty_tier: "Low",    risk_score: 0.54, risk_tier: "medium", top_risk_condition: "HF"   },
  { provider_id: "390232", name: "Penn Presbyterian Medical Center",      city: "Philadelphia", state: "PA", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.38, penalty_tier: "Medium", risk_score: 0.56, risk_tier: "medium", top_risk_condition: "COPD" },
  { provider_id: "100006", name: "Summit Care Hospital",                  city: "Denver",       state: "CO", ownership_type: "Government",             star_rating: 3, penalized: true,  penalty_pct: 0.28, penalty_tier: "Low",    risk_score: 0.52, risk_tier: "medium", top_risk_condition: "COPD" },
  { provider_id: "330101", name: "Albany Medical Center",                 city: "Albany",       state: "NY", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.15, penalty_tier: "Low",    risk_score: 0.48, risk_tier: "medium", top_risk_condition: "HF"   },
  { provider_id: "310037", name: "Cooper University Hospital",            city: "Camden",       state: "NJ", ownership_type: "Voluntary Non-profit", star_rating: 3, penalized: true,  penalty_pct: 0.33, penalty_tier: "Low",    risk_score: 0.53, risk_tier: "medium", top_risk_condition: "PN"   },
  // Low risk – not penalized
  { provider_id: "100001", name: "Regate General Hospital",               city: "Dallas",       state: "TX", ownership_type: "Voluntary Non-profit", star_rating: 4, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.31, risk_tier: "low",    top_risk_condition: "HF"   },
  { provider_id: "100004", name: "Lakeside Community Hospital",           city: "Orlando",      state: "FL", ownership_type: "Voluntary Non-profit", star_rating: 5, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.22, risk_tier: "low",    top_risk_condition: "AMI"  },
  { provider_id: "220038", name: "University of Minnesota Medical Center",city: "Minneapolis",  state: "MN", ownership_type: "Voluntary Non-profit", star_rating: 4, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.28, risk_tier: "low",    top_risk_condition: "CABG" },
  { provider_id: "160015", name: "St. Luke's Regional Medical Center",    city: "Boise",        state: "ID", ownership_type: "Voluntary Non-profit", star_rating: 5, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.19, risk_tier: "low",    top_risk_condition: "PN"   },
  { provider_id: "170185", name: "Barnes-Jewish Hospital",                city: "St. Louis",    state: "MO", ownership_type: "Voluntary Non-profit", star_rating: 5, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.18, risk_tier: "low",    top_risk_condition: "CABG" },
  { provider_id: "520138", name: "University of Wisconsin Hospitals",     city: "Madison",      state: "WI", ownership_type: "Government",             star_rating: 4, penalized: false, penalty_pct: null, penalty_tier: "None",   risk_score: 0.29, risk_tier: "low",    top_risk_condition: "HK"   },
];

export function demoHospitalList(params: HospitalQuery): HospitalListResponse {
  let rows = [...DEMO_ROWS];
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (r.state ?? "").toLowerCase().includes(q),
    );
  }
  if (params.state) rows = rows.filter((r) => r.state === params.state);
  if (params.ownership) rows = rows.filter((r) => r.ownership_type === params.ownership);
  if (params.penalized !== undefined) rows = rows.filter((r) => r.penalized === params.penalized);
  if (params.min_stars) rows = rows.filter((r) => (r.star_rating ?? 0) >= params.min_stars!);
  if (params.risk_tier) rows = rows.filter((r) => r.risk_tier === params.risk_tier);

  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 20;
  const start = (page - 1) * pageSize;
  return {
    total_count: rows.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    hospitals: rows.slice(start, start + pageSize),
  };
}

export const DEMO_HOSPITAL_PROFILE: HospitalProfile = {
  provider_id: "100002",
  name: "Metro Medical Center",
  address: null,
  city: "Phoenix",
  state: "AZ",
  zip: "85004",
  county: "Maricopa",
  phone: "6025550100",
  hospital_type: "Acute Care Hospitals",
  ownership_type: "Proprietary",
  emergency_services: true,
  star_rating: 2,
  penalized: true,
  penalty_pct: 0.82,
  penalty_tier: "Medium",
  risk_score: 0.74,
  risk_tier: "high",
  estimated_penalty_usd: 410000,
  cms_compare_url: "https://www.medicare.gov/care-compare/details/hospital/100002",
  condition_breakdown: [
    { condition: "AMI", condition_name: "Acute Myocardial Infarction", readmission_rate: 16.8, national_avg: 15.6, compared_to_national: "Worse", excess_readmission_ratio: 1.05, risk_contribution_pct: 18.0 },
    { condition: "HF", condition_name: "Heart Failure", readmission_rate: 24.3, national_avg: 21.7, compared_to_national: "Worse", excess_readmission_ratio: 1.12, risk_contribution_pct: 34.0 },
    { condition: "PN", condition_name: "Pneumonia", readmission_rate: 18.9, national_avg: 17.0, compared_to_national: "Worse", excess_readmission_ratio: 1.06, risk_contribution_pct: 20.0 },
    { condition: "COPD", condition_name: "Chronic Obstructive Pulmonary Disease", readmission_rate: 21.6, national_avg: 19.4, compared_to_national: "Worse", excess_readmission_ratio: 1.08, risk_contribution_pct: 22.0 },
    { condition: "HK", condition_name: "Hip/Knee Replacement", readmission_rate: 4.1, national_avg: 4.3, compared_to_national: "Better", excess_readmission_ratio: 0.96, risk_contribution_pct: 3.0 },
    { condition: "CABG", condition_name: "Coronary Artery Bypass Grafting", readmission_rate: 12.4, national_avg: 12.6, compared_to_national: "Better", excess_readmission_ratio: 0.98, risk_contribution_pct: 3.0 },
  ],
  risk_factors: [
    { factor: "Average Readmission Rate", impact: "High", value: 19.7, description: "Hospital-wide 30-day readmission rate vs national average of 16.7%" },
    { factor: "Conditions Above National Average", impact: "High", value: 4, description: "Number of HRRP conditions with excess readmission ratio above 1.0" },
    { factor: "Quality Star Rating", impact: "High", value: 2, description: "CMS overall hospital quality star rating (1-5)" },
  ],
  recommendations: [
    "Implement heart failure transitional care program - target 30-day follow-up within 72 hours of discharge",
    "Address patient experience metrics (HCAHPS) contributing to low overall quality rating",
    "Benchmark readmission prevention spending against voluntary non-profit peers of similar size",
  ],
  peer_comparison: {
    peer_group: "2-star Proprietary hospitals in AZ",
    peer_count: 24,
    percentile: 78,
    peer_avg_penalty_pct: 0.55,
    peer_avg_readmission_rate: 18.9,
  },
  historical_trend: [
    { fiscal_year: "FY2024", penalized: true, penalty_pct: 0.61 },
    { fiscal_year: "FY2025", penalized: true, penalty_pct: 0.71 },
    { fiscal_year: "FY2026", penalized: true, penalty_pct: 0.76 },
    { fiscal_year: "FY2027", penalized: true, penalty_pct: 0.82 },
  ],
};

function tierFromProb(prob: number): RiskTierLabel {
  if (prob >= 0.65) return "High Risk";
  if (prob >= 0.55) return "Medium Risk";
  if (prob >= 0.45) return "Low Risk";
  return "No Risk";
}

export function demoHospitalPenalty(input: HospitalPenaltyInput): HospitalPenaltyResult {
  const avg = input.avg_readmission_rate ?? 18;
  const cond = input.conditions_above_national ?? 0;
  const star = input.star_rating ?? 3;
  let prob = 0.35 + (avg - 15) * 0.03 + cond * 0.06 + (3 - star) * 0.04;
  prob = Math.min(0.99, Math.max(0.01, prob));
  const penaltyPct = Math.min(3, Math.max(0, (prob - 0.4) * 3));
  return {
    penalty_probability: Number(prob.toFixed(4)),
    penalty_tier: tierFromProb(prob),
    estimated_penalty_pct: Number(penaltyPct.toFixed(3)),
    estimated_dollar_impact: Math.round((penaltyPct / 100) * 50_000_000),
    estimated_confidence_interval: {
      lower: Number(Math.max(0, prob - 0.1).toFixed(4)),
      upper: Number(Math.min(1, prob + 0.1).toFixed(4)),
    },
    ci_method: "heuristic",
    data_notes: "Demo mode: figures are illustrative only.",
    top_risk_factors: [
      { factor: "avg_readmission_rate", label: "Mean Readmission Rate", impact: avg > 18 ? "High" : "Medium", value: avg, national_avg: 16.7, gap: Number((avg - 16.7).toFixed(2)) },
      { factor: "conditions_above_national", label: "Conditions Above National Avg", impact: cond >= 3 ? "High" : cond >= 1 ? "Medium" : "Low", value: cond, national_avg: 0, gap: cond },
      { factor: "star_rating", label: "Quality Star Rating", impact: star <= 2 ? "High" : star === 3 ? "Medium" : "Low", value: star, national_avg: 3, gap: star - 3 },
    ],
    recommendations: [
      "Establish a multidisciplinary readmission review committee to audit 30-day bouncebacks",
      "Standardize discharge medication reconciliation and teach-back education for high-risk patients",
      "Schedule follow-up appointments prior to discharge and confirm patient transportation",
    ],
    comparable_hospitals: 42,
  };
}

export function demoPatientReadmission(input: PatientReadmissionInput): PatientReadmissionResult {
  let prob = 0.2;
  prob += (input.number_diagnoses ?? 5) * 0.03;
  prob += (input.num_medications ?? 10) * 0.01;
  prob += (input.time_in_hospital ?? 4) * 0.02;
  prob = Math.min(0.99, Math.max(0.01, prob));
  const level = prob >= 0.7 ? "Critical" : prob >= 0.5 ? "High" : prob >= 0.3 ? "Moderate" : "Low";
  return {
    readmission_probability: Number(prob.toFixed(4)),
    risk_level: level,
    estimated_cost_if_readmitted: 15200,
    top_risk_factors: [
      { factor: "number_diagnoses", label: "Number of Diagnoses", impact: (input.number_diagnoses ?? 0) >= 9 ? "High" : "Medium", value: input.number_diagnoses ?? 5 },
      { factor: "num_medications", label: "Number of Medications", impact: (input.num_medications ?? 0) >= 20 ? "High" : "Medium", value: input.num_medications ?? 10 },
      { factor: "time_in_hospital", label: "Length of Stay (days)", impact: (input.time_in_hospital ?? 0) >= 7 ? "High" : "Low", value: input.time_in_hospital ?? 4 },
    ],
    recommended_interventions: [
      "Confirm follow-up appointment and transportation before discharge",
      "Provide written, plain-language discharge instructions with teach-back",
      "Verify pharmacy access and medication affordability for prescribed regimen",
    ],
    risk_percentile: Math.min(99, Math.max(1, Math.round(50 + (prob - 0.15) * 100))),
  };
}

// Map intervention condition keys to baseline request fields
const CONDITION_RATE_KEYS: Record<string, string> = {
  heart_failure: "hf_readmission_rate",
  pneumonia:     "pneumonia_readmission_rate",
  ami:           "ami_readmission_rate",
  copd:          "copd_readmission_rate",
  hip_knee:      "hip_knee_readmission_rate",
  cabg:          "cabg_readmission_rate",
};

const CONDITION_DEFAULTS: Record<string, number> = {
  heart_failure: 23,
  pneumonia:     18,
  ami:           16.5,
  copd:          21,
  hip_knee:      4.5,
  cabg:          13,
};

export function demoIntervention(body: InterventionRequest): InterventionResult {
  const totalReduction = body.interventions.reduce((s, i) => s + i.reduction_pct, 0);
  const beforeProb = 0.72;
  const afterProb = Math.max(0.05, beforeProb - totalReduction * 0.004);
  const beforePct = 0.9;
  const afterPct = Math.max(0, beforePct - totalReduction * 0.01);
  return {
    before: {
      penalty_probability: beforeProb,
      penalty_tier: tierFromProb(beforeProb),
      estimated_penalty_pct: beforePct,
      estimated_dollar_impact: Math.round((beforePct / 100) * 50_000_000),
    },
    after: {
      penalty_probability: Number(afterProb.toFixed(4)),
      penalty_tier: tierFromProb(afterProb),
      estimated_penalty_pct: Number(afterPct.toFixed(3)),
      estimated_dollar_impact: Math.round((afterPct / 100) * 50_000_000),
    },
    improvement: {
      probability_reduction: Number((beforeProb - afterProb).toFixed(4)),
      dollar_savings: Math.round(((beforePct - afterPct) / 100) * 50_000_000),
      tier_change: `${tierFromProb(beforeProb)} -> ${tierFromProb(afterProb)}`,
    },
    interventions_applied: body.interventions.map((i) => {
      const rateKey = CONDITION_RATE_KEYS[i.condition];
      const origRate: number =
        (rateKey && body.baseline && typeof (body.baseline as Record<string, unknown>)[rateKey] === "number"
          ? (body.baseline as Record<string, unknown>)[rateKey] as number
          : null) ?? CONDITION_DEFAULTS[i.condition] ?? 22;
      return {
        condition: i.condition,
        original_rate: origRate,
        new_rate: Number((origRate * (1 - i.reduction_pct / 100)).toFixed(1)),
        reduction_pct: i.reduction_pct,
      };
    }),
  };
}
