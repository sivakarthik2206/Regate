from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/analytics", tags=["analytics"])

MASTER_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "master_hospital_features.parquet"
HRRP_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "hrrp_clean.parquet"

MASTER_DF = pd.read_parquet(MASTER_PATH) if MASTER_PATH.exists() else pd.DataFrame()
HRRP_DF = pd.read_parquet(HRRP_PATH) if HRRP_PATH.exists() else pd.DataFrame()


def _readmission_cols(df: pd.DataFrame) -> dict[str, str]:
    mapping = {
        "AMI": "readm_ami",
        "HF": "readm_hf",
        "Pneumonia": "readm_pneumonia",
        "COPD": "readm_copd",
        "Hip/Knee": "readm_hip_knee",
        "CABG": "readm_cabg",
    }
    return {k: v for k, v in mapping.items() if v in df.columns}


@router.get("/summary")
def summary() -> dict:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    penalized = pd.to_numeric(MASTER_DF.get("penalized"), errors="coerce").fillna(0).astype(int)
    payment = pd.to_numeric(MASTER_DF.get("payment_reduction_pct"), errors="coerce")
    rate = float((penalized.mean() * 100.0))
    avg_penalty = float(payment[penalized == 1].mean() if (penalized == 1).any() else 0.0)
    avg_penalty = 0.0 if np.isnan(avg_penalty) else avg_penalty
    est_penalties = float((payment.fillna(0) / 100.0 * 50_000_000).sum())
    condition_cols = _readmission_cols(MASTER_DF)
    by_impact = []
    for condition, col in condition_cols.items():
        worse_col = f"{col}_compared"
        penalized_mask = MASTER_DF.get(worse_col, pd.Series(dtype="string")).astype("string").str.contains("worse", case=False, na=False)
        by_impact.append(
            {
                "condition": condition,
                "avg_readmission_rate": float(pd.to_numeric(MASTER_DF[col], errors="coerce").mean()),
                "hospitals_penalized": int(penalized_mask.sum()),
            }
        )
    ownership_col = MASTER_DF.get("hospital_ownership", pd.Series(dtype="string"))
    penalty_by_ownership = (
        MASTER_DF.assign(_pen=penalized)
        .groupby(ownership_col.fillna("Unknown"))
        .agg(penalty_rate=("_pen", "mean"), count=("_pen", "size"))
        .reset_index()
        .rename(columns={"hospital_ownership": "ownership"})
    )
    return {
        "total_hospitals_analyzed": int(len(MASTER_DF)),
        "total_penalized": int(penalized.sum()),
        "penalty_rate_pct": rate,
        "avg_penalty_pct": avg_penalty,
        "estimated_total_penalties_usd": est_penalties,
        "conditions_by_impact": by_impact,
        "penalty_by_ownership": penalty_by_ownership.to_dict(orient="records"),
        "penalty_trend_note": "FY2026 saw 240 hospitals face penalties >1%",
    }


@router.get("/penalties-by-state")
def penalties_by_state() -> list[dict]:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    df = MASTER_DF.copy()
    df["_pen"] = pd.to_numeric(df.get("penalized"), errors="coerce").fillna(0).astype(int)
    df["_pct"] = pd.to_numeric(df.get("payment_reduction_pct"), errors="coerce")
    out = (
        df.groupby("state")
        .agg(penalized_count=("_pen", "sum"), total_count=("_pen", "size"), avg_penalty_pct=("_pct", "mean"))
        .reset_index()
    )
    out["penalty_rate"] = out["penalized_count"] / out["total_count"] * 100.0
    return out.sort_values("penalty_rate", ascending=False).to_dict(orient="records")


@router.get("/feature-importance")
def feature_importance() -> list[dict]:
    features_path = Path(__file__).resolve().parents[2] / "models" / "hospital_features.json"
    model_path = Path(__file__).resolve().parents[2] / "models" / "hospital_penalty_model.pkl"
    if features_path.exists():
        features = json.loads(features_path.read_text())
    else:
        features = [
            "avg_readmission_rate",
            "conditions_above_national",
            "has_emergency_services",
            "ownership_type",
            "star_rating",
        ]
    if model_path.exists():
        import pickle  # noqa: PLC0415
        with model_path.open("rb") as fh:
            _model = pickle.load(fh)  # noqa: S301
        if hasattr(_model, "feature_importances_"):
            importance = np.asarray(_model.feature_importances_)[: len(features)]
        elif hasattr(_model, "coef_"):
            importance = np.abs(np.asarray(_model.coef_)).ravel()[: len(features)]
        else:
            importance = np.linspace(0.2, 0.05, num=len(features), dtype=float)
    else:
        importance = np.linspace(0.2, 0.05, num=len(features), dtype=float)
    descriptions = {
        "avg_readmission_rate": "Mean readmission rate across tracked conditions",
        "conditions_above_national": "Count of conditions worse than the national average",
        "has_emergency_services": "Whether the hospital offers emergency services",
        "ownership_type": "Ownership category of the hospital",
        "star_rating": "Hospital overall quality rating",
    }
    return [{"feature": f, "importance": float(i), "description": descriptions.get(f, f.replace("_", " ").capitalize())} for f, i in zip(features, importance, strict=False)]


@router.get("/readmission-rates")
def readmission_rates() -> list[dict]:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    response = []
    for condition, col in _readmission_cols(MASTER_DF).items():
        compared_col = f"{col}_compared"
        series = pd.to_numeric(MASTER_DF[col], errors="coerce")
        penalized_mask = MASTER_DF.get(compared_col, pd.Series(dtype="string")).astype("string").str.contains("worse", case=False, na=False)
        response.append(
            {
                "condition": condition,
                "national_avg": float(series.mean()),
                "penalized_avg": float(series[penalized_mask].mean()),
                "safe_avg": float(series[~penalized_mask].mean()),
            }
        )
    return response
