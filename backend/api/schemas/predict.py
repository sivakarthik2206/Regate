from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

OwnershipType = Literal["Government", "Proprietary", "Voluntary non-profit"]
A1cResult = Literal["Normal", ">7", ">8", "Not Tested"]
InsulinValue = Literal["No", "Steady", "Up", "Down"]


class HospitalRiskInput(BaseModel):
    avg_readmission_rate: float = Field(..., ge=0, le=100, description="Average readmission rate across conditions")
    conditions_above_national: int = Field(..., ge=0, le=6, description="Number of conditions worse than national average")
    has_emergency_services: bool
    ownership_type: OwnershipType = Field(..., description="Government | Proprietary | Voluntary non-profit")
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    ami_readmission_rate: Optional[float] = None
    hf_readmission_rate: Optional[float] = None
    pneumonia_readmission_rate: Optional[float] = None
    copd_readmission_rate: Optional[float] = None
    hip_knee_readmission_rate: Optional[float] = None
    cabg_readmission_rate: Optional[float] = None


class HospitalRiskOutput(BaseModel):
    penalty_probability: float
    penalty_tier: str
    estimated_penalty_pct: float
    estimated_dollar_impact: float
    top_risk_factors: List[dict]
    recommendations: List[str]


class PatientRiskInput(BaseModel):
    age: int = Field(..., ge=0, le=120)
    time_in_hospital: int = Field(..., ge=1, le=14)
    num_medications: int = Field(..., ge=0, le=80)
    number_diagnoses: int = Field(..., ge=1, le=16)
    num_lab_procedures: int = Field(..., ge=0, le=132)
    num_procedures: int = Field(..., ge=0, le=6)
    a1c_result: A1cResult = Field(..., description="Normal | >7 | >8 | Not Tested")
    insulin: InsulinValue = Field(..., description="No | Steady | Up | Down")
    diabetes_med: bool


class PatientRiskOutput(BaseModel):
    readmission_probability: float
    risk_level: str
    top_risk_factors: List[dict]
    recommended_interventions: List[str]
    estimated_cost_if_readmitted: float
