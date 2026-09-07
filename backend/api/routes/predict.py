from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.model_store import ModelStore

AUDIT_LOGGER = logging.getLogger("regate.audit")

router = APIRouter(prefix="/predict", tags=["predict"])


def _store(request: Request) -> ModelStore:
    return request.app.state.model_store


class HospitalPenaltyRequest(BaseModel):
    avg_readmission_rate: float
    conditions_above_national: Optional[int] = Field(default=0, ge=0, le=6)
    has_emergency_services: Optional[bool] = True
    ownership_type: Optional[str] = None
    star_rating: Optional[int] = Field(default=None, ge=1, le=5)
    ami_readmission_rate: Optional[float] = None
    hf_readmission_rate: Optional[float] = None
    pneumonia_readmission_rate: Optional[float] = None
    copd_readmission_rate: Optional[float] = None
    hip_knee_readmission_rate: Optional[float] = None
    cabg_readmission_rate: Optional[float] = None


class PatientReadmissionRequest(BaseModel):
    age: Optional[float] = None
    time_in_hospital: Optional[float] = None
    num_medications: Optional[float] = None
    number_diagnoses: Optional[float] = None
    num_lab_procedures: Optional[float] = None
    num_procedures: Optional[float] = None
    a1c_result: Optional[str] = None
    insulin: Optional[str] = None
    diabetes_med: Optional[Any] = None


class InterventionItem(BaseModel):
    condition: str
    reduction_pct: float


class InterventionRequest(BaseModel):
    provider_id: Optional[str] = None
    baseline: Optional[dict[str, Any]] = None
    interventions: list[InterventionItem] = Field(default_factory=list)


@router.post("/hospital-penalty")
def hospital_penalty(request: Request, body: HospitalPenaltyRequest) -> dict[str, Any]:
    try:
        result = _store(request).predict_hospital_penalty(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    AUDIT_LOGGER.info(
        "prediction endpoint=hospital_penalty tier=%s prob=%.4f",
        result["penalty_tier"],
        result["penalty_probability"],
    )
    return result


@router.post("/patient-readmission")
def patient_readmission(request: Request, body: PatientReadmissionRequest) -> dict[str, Any]:
    result = _store(request).predict_patient_readmission(body.model_dump())
    AUDIT_LOGGER.info(
        "prediction endpoint=patient_readmission level=%s prob=%.4f",
        result["risk_level"],
        result["readmission_probability"],
    )
    return result


@router.post("/intervention-simulation")
def intervention_simulation(request: Request, body: InterventionRequest) -> dict[str, Any]:
    store = _store(request)
    interventions = [i.model_dump() for i in body.interventions]
    try:
        result = store.simulate_intervention(body.provider_id, body.baseline, interventions)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Hospital {body.provider_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    AUDIT_LOGGER.info(
        "prediction endpoint=intervention_simulation tier_change=%s dollar_savings=%s",
        result["improvement"]["tier_change"],
        result["improvement"]["dollar_savings"],
    )
    return result


