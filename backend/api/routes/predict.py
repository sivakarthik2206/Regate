from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Request

from api.schemas.predict import HospitalRiskInput, HospitalRiskOutput, PatientRiskInput, PatientRiskOutput

router = APIRouter(prefix="/predict", tags=["predict"])

FEATURE_LABELS: dict[str, str] = {
    "mean_readmission_rate": "Mean Readmission Rate",
    "avg_readmission_rate": "Mean Readmission Rate",
    "conditions_above_national": "Conditions Above National Average",
    "has_emergency_services": "Emergency Services Available",
    "ownership_encoded": "Hospital Ownership Type",
    "ownership_type": "Hospital Ownership Type",
    "star_rating_numeric": "Overall Quality Star Rating",
    "star_rating": "Overall Quality Star Rating",
    "time_in_hospital": "Length of Hospital Stay",
    "num_medications": "Number of Medications",
    "number_diagnoses": "Number of Diagnoses",
    "num_lab_procedures": "Number of Lab Procedures",
    "num_procedures": "Number of Procedures",
    "a1c_result": "HbA1c Test Result",
    "insulin": "Insulin Regimen",
    "diabetes_med": "Diabetes Medication",
    "age": "Patient Age",
}

_CONDITION_NAMES = ["AMI", "Heart Failure", "Pneumonia", "COPD", "Hip/Knee", "CABG"]


def _get_store(request: Request):
    store = getattr(request.app.state, "model_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="Model store not initialized")
    return store


def _build_frame(payload: dict[str, Any], feature_order: list[str]) -> pd.DataFrame:
    frame = pd.DataFrame([payload])
    for column in feature_order:
        if column not in frame.columns:
            frame[column] = np.nan
    return frame[feature_order]


def _score_tier(probability: float) -> str:
    if probability < 0.25:
        return "No Risk"
    if probability < 0.5:
        return "Low Risk"
    if probability < 0.75:
        return "Medium Risk"
    return "High Risk"


def _patient_risk_level(probability: float) -> str:
    if probability < 0.25:
        return "Low"
    if probability < 0.5:
        return "Moderate"
    if probability < 0.75:
        return "High"
    return "Critical"


def _top_factors_from_values(values: dict[str, Any], importance: dict[str, float], top_n: int = 5) -> list[dict]:
    scored = [
        {
            "factor": feature,
            "label": FEATURE_LABELS.get(feature, feature.replace("_", " ").title()),
            "value": values.get(feature),
        }
        for feature, imp in importance.items()
    ]
    scored.sort(key=lambda item: importance.get(item["factor"], 0.0), reverse=True)
    top = scored[:top_n]
    for i, item in enumerate(top):
        item["impact"] = "high" if i < 2 else "medium" if i == 2 else "low"
    return top


def _recommendations_for_hospital(payload: HospitalRiskInput) -> list[str]:
    recs = []

    if payload.avg_readmission_rate > 15.0:
        recs.append("Implement transitional care programs for high-risk discharges including 48-hour post-discharge phone follow-up.")

    if payload.conditions_above_national >= 3:
        # Find the worst condition from individual rate fields if available
        condition_rates = {
            "AMI": payload.ami_readmission_rate,
            "Heart Failure": payload.hf_readmission_rate,
            "Pneumonia": payload.pneumonia_readmission_rate,
            "COPD": payload.copd_readmission_rate,
            "Hip/Knee": payload.hip_knee_readmission_rate,
            "CABG": payload.cabg_readmission_rate,
        }
        available = {k: v for k, v in condition_rates.items() if v is not None}
        if available:
            worst = max(available, key=lambda c: available[c])
            recs.append(f"Target quality improvement on {worst} — currently the highest readmission rate among tracked conditions.")
        else:
            recs.append("Target quality improvement on conditions with the highest gap versus national benchmark.")
    elif payload.conditions_above_national >= 1:
        recs.append("Engage condition-specific clinical teams to close the gap on conditions performing below national average.")

    if payload.star_rating is not None and payload.star_rating <= 2:
        recs.append("Address patient experience metrics contributing to low overall star rating, focusing on communication and care coordination scores.")

    if payload.ownership_type.lower().startswith("proprietary"):
        recs.append("Benchmark readmission prevention spending against non-profit peers and evaluate care management program investment.")

    if payload.has_emergency_services:
        recs.append("Review ED-to-observation workflows to reduce avoidable inpatient admissions that inflate readmission denominators.")

    return recs or ["Maintain current quality programs and continue monitoring readmission drivers quarterly."]


def _recommendations_for_patient(payload: PatientRiskInput) -> list[str]:
    recs = []

    if payload.time_in_hospital > 5:
        recs.append("Strengthen discharge planning with a structured checklist and schedule follow-up appointment before patient leaves the facility.")

    if payload.num_medications > 10:
        recs.append("Conduct pharmacist-led medication reconciliation and simplify regimen where clinically appropriate to reduce polypharmacy risk.")

    if payload.number_diagnoses > 7:
        recs.append("Escalate to case management for coordinated post-discharge care and timely outpatient specialist follow-up.")

    if payload.diabetes_med:
        recs.append("Provide diabetes self-management education and ensure glucose monitoring supplies are prescribed before discharge.")

    if payload.insulin != "No":
        recs.append("Confirm insulin administration technique and arrange home health nursing for insulin-dependent patients.")

    if payload.a1c_result in (">7", ">8"):
        recs.append("Refer to endocrinology or diabetes care team for optimized glycemic management plan.")

    return recs or ["Continue standard follow-up protocol and reinforce medication adherence counseling at discharge."]


def _importance_from_model(model: Any, feature_names: list[str]) -> dict[str, float]:
    if hasattr(model, "coef_"):
        values = np.abs(np.asarray(model.coef_)).ravel()
    elif hasattr(model, "feature_importances_"):
        values = np.asarray(model.feature_importances_)
    else:
        values = np.zeros(len(feature_names), dtype=float)
    return {feature: float(value) for feature, value in zip(feature_names, values, strict=False)}


def _fallback_hospital_probability(payload: HospitalRiskInput) -> float:
    score = 0.15
    score += min(payload.avg_readmission_rate / 100.0, 0.35)
    score += min(payload.conditions_above_national * 0.08, 0.35)
    score += 0.08 if payload.has_emergency_services else 0.0
    score += {"government": 0.0, "proprietary": 0.06, "voluntary non-profit": 0.03}.get(payload.ownership_type.lower(), 0.02)
    if payload.star_rating is not None:
        score += max(0.0, (3 - payload.star_rating) * 0.04)
    return float(min(max(score, 0.01), 0.99))


def _fallback_patient_probability(payload: PatientRiskInput) -> float:
    score = 0.12
    score += min(payload.time_in_hospital / 20.0, 0.28)
    score += min(payload.num_medications / 100.0, 0.18)
    score += min(payload.number_diagnoses / 30.0, 0.15)
    score += 0.08 if payload.diabetes_med else 0.0
    score += 0.05 if payload.insulin != "No" else 0.0
    return float(min(max(score, 0.01), 0.99))


@router.post("/hospital-penalty", response_model=HospitalRiskOutput)
def predict_hospital_penalty(payload: HospitalRiskInput, request: Request) -> HospitalRiskOutput:
    store = _get_store(request)
    feature_order = store.hospital_features
    frame = _build_frame(payload.model_dump(), feature_order)
    model_input = store.hospital_scaler.transform(frame) if store.hospital_scaler is not None and hasattr(store.hospital_scaler, "transform") else frame
    probability = float(store.hospital_model.predict_proba(model_input)[0][1]) if store.hospital_model is not None and hasattr(store.hospital_model, "predict_proba") else _fallback_hospital_probability(payload)
    if store.penalty_severity_model is not None and hasattr(store.penalty_severity_model, "predict"):
        estimated_penalty_pct = float(store.penalty_severity_model.predict(model_input)[0])
    else:
        estimated_penalty_pct = round(max(0.0, (probability - 0.25) * 2.0), 2)
    estimated_dollar_impact = estimated_penalty_pct * 50_000_000 / 100.0
    importance = _importance_from_model(store.hospital_model, feature_order) if store.hospital_model is not None else {
        "avg_readmission_rate": 0.3,
        "conditions_above_national": 0.25,
        "has_emergency_services": 0.15,
        "ownership_type": 0.12,
        "star_rating": 0.18,
    }
    top_factors = _top_factors_from_values(payload.model_dump(), importance)
    return HospitalRiskOutput(
        penalty_probability=probability,
        penalty_tier=_score_tier(probability),
        estimated_penalty_pct=estimated_penalty_pct,
        estimated_dollar_impact=estimated_dollar_impact,
        top_risk_factors=top_factors,
        recommendations=_recommendations_for_hospital(payload),
    )


@router.post("/patient-readmission", response_model=PatientRiskOutput)
def predict_patient_readmission(payload: PatientRiskInput, request: Request) -> PatientRiskOutput:
    store = _get_store(request)
    feature_order = store.patient_features
    frame = _build_frame(payload.model_dump(), feature_order)
    model_input = store.patient_scaler.transform(frame) if store.patient_scaler is not None and hasattr(store.patient_scaler, "transform") else frame
    probability = float(store.patient_model.predict_proba(model_input)[0][1]) if store.patient_model is not None and hasattr(store.patient_model, "predict_proba") else _fallback_patient_probability(payload)
    importance = _importance_from_model(store.patient_model, feature_order) if store.patient_model is not None else {
        "time_in_hospital": 0.32,
        "num_medications": 0.26,
        "number_diagnoses": 0.18,
        "age": 0.12,
        "diabetes_med": 0.12,
    }
    top_factors = _top_factors_from_values(payload.model_dump(), importance)
    return PatientRiskOutput(
        readmission_probability=probability,
        risk_level=_patient_risk_level(probability),
        top_risk_factors=top_factors,
        recommended_interventions=_recommendations_for_patient(payload),
        estimated_cost_if_readmitted=15_200.0,
    )


@router.get("/hospital-penalty/demo", response_model=HospitalRiskOutput)
def hospital_demo() -> HospitalRiskOutput:
    return HospitalRiskOutput(
        penalty_probability=0.82,
        penalty_tier="High Risk",
        estimated_penalty_pct=1.25,
        estimated_dollar_impact=625_000.0,
        top_risk_factors=[
            {"factor": "conditions_above_national", "label": "Conditions Above National Average", "impact": "high", "value": 5},
            {"factor": "avg_readmission_rate", "label": "Mean Readmission Rate", "impact": "high", "value": 24.8},
            {"factor": "star_rating", "label": "Overall Quality Star Rating", "impact": "medium", "value": 2},
        ],
        recommendations=[
            "Implement transitional care programs for high-risk discharges including 48-hour post-discharge phone follow-up.",
            "Target quality improvement on Heart Failure — currently the highest readmission rate among tracked conditions.",
            "Address patient experience metrics contributing to low overall star rating, focusing on communication and care coordination scores.",
            "Benchmark readmission prevention spending against non-profit peers and evaluate care management program investment.",
        ],
    )


@router.get("/patient-readmission/demo", response_model=PatientRiskOutput)
def patient_demo() -> PatientRiskOutput:
    return PatientRiskOutput(
        readmission_probability=0.67,
        risk_level="High",
        top_risk_factors=[
            {"factor": "time_in_hospital", "label": "Length of Hospital Stay", "impact": "high", "value": 8},
            {"factor": "num_medications", "label": "Number of Medications", "impact": "high", "value": 18},
            {"factor": "number_diagnoses", "label": "Number of Diagnoses", "impact": "medium", "value": 9},
        ],
        recommended_interventions=[
            "Strengthen discharge planning with a structured checklist and schedule follow-up appointment before patient leaves the facility.",
            "Conduct pharmacist-led medication reconciliation and simplify regimen where clinically appropriate to reduce polypharmacy risk.",
            "Escalate to case management for coordinated post-discharge care and timely outpatient specialist follow-up.",
            "Provide diabetes self-management education and ensure glucose monitoring supplies are prescribed before discharge.",
        ],
        estimated_cost_if_readmitted=15200.0,
    )
