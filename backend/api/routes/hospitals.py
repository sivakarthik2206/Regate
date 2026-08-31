from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

MASTER_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "master_hospital_features.parquet"
_RAW_DF = pd.read_parquet(MASTER_PATH) if MASTER_PATH.exists() else pd.DataFrame()


def _normalize_provider_id(value: str) -> str:
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return digits.zfill(6)


def _build_clean_df(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["provider_id"] = result["provider_id"].map(_normalize_provider_id)
    return result


MASTER_DF = _build_clean_df(_RAW_DF) if not _RAW_DF.empty else pd.DataFrame()


@router.get("")
def list_hospitals(
    state: str | None = None,
    penalized: bool | None = None,
    min_stars: int | None = Query(default=None, ge=1, le=5),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    df = MASTER_DF
    if state:
        df = df[df["state"].astype("string").str.upper() == state.upper()]
    if penalized is not None:
        df = df[pd.to_numeric(df["penalized"], errors="coerce").fillna(0).astype(int) == int(penalized)]
    if min_stars is not None:
        df = df[pd.to_numeric(df["overall_rating"], errors="coerce") >= min_stars]
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    items = df.iloc[start:end][
        ["provider_id", "hospital_name", "state", "city", "hospital_ownership", "overall_rating", "penalized", "payment_reduction_pct", "penalty_tier"]
    ].copy()
    items = items.rename(
        columns={
            "hospital_name": "name",
            "hospital_ownership": "ownership_type",
            "overall_rating": "star_rating",
            "payment_reduction_pct": "penalty_pct",
        }
    )
    return {"page": page, "page_size": page_size, "total": total, "items": items.to_dict(orient="records")}


@router.get("/search")
def search_hospitals(q: str, limit: int = Query(default=10, ge=1, le=50)) -> list[dict]:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    df = MASTER_DF
    query = q.strip().lower()
    mask = (
        df["hospital_name"].astype("string").str.lower().str.contains(query, na=False, regex=False)
        | df["city"].astype("string").str.lower().str.contains(query, na=False, regex=False)
    )
    return df[mask].head(limit)[["provider_id", "hospital_name", "city", "state"]].rename(columns={"hospital_name": "name"}).to_dict(orient="records")


@router.get("/{provider_id}")
def get_hospital(provider_id: str) -> dict:
    if MASTER_DF.empty:
        raise HTTPException(status_code=503, detail="Master hospital dataset unavailable")
    df = MASTER_DF
    key = _normalize_provider_id(provider_id)
    row = df[df["provider_id"] == key]
    if row.empty:
        raise HTTPException(status_code=404, detail="Hospital not found")
    record = row.iloc[0].to_dict()
    renames = {
        "hospital_name": "name",
        "hospital_ownership": "ownership_type",
        "overall_rating": "star_rating",
        "payment_reduction_pct": "penalty_pct",
    }
    return {renames.get(k, k): v for k, v in record.items()}
