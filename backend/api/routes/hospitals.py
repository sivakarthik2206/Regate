from __future__ import annotations

import re
from typing import Any, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request

from api.model_store import ModelStore


def _sanitize_provider_id(provider_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "", provider_id)[:20]

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


def _store(request: Request) -> ModelStore:
    return request.app.state.model_store


_SORT_COLUMNS = {
    "name": "hospital_name",
    "penalty_pct": "penalty_pct",
    "risk_score": "risk_score",
    "star_rating": "star_rating",
}


@router.get("")
def list_hospitals(
    request: Request,
    q: Optional[str] = None,
    state: Optional[str] = None,
    ownership: Optional[str] = None,
    penalized: Optional[bool] = None,
    min_stars: Optional[int] = None,
    max_stars: Optional[int] = None,
    risk_tier: Optional[str] = None,
    sort_by: str = "risk_score",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    store = _store(request)
    filters = {
        "state": state,
        "ownership": ownership,
        "penalized": penalized,
        "min_stars": min_stars,
        "max_stars": max_stars,
        "risk_tier": risk_tier,
    }
    result = store.search_hospitals(q, filters).copy()

    sort_col = _SORT_COLUMNS.get(sort_by, "risk_score")
    ascending = sort_order.lower() == "asc"
    if sort_col in result.columns:
        if sort_col == "hospital_name":
            result = result.sort_values(sort_col, ascending=ascending, na_position="last")
        else:
            result = result.assign(_sortkey=pd.to_numeric(result[sort_col], errors="coerce"))
            result = result.sort_values("_sortkey", ascending=ascending, na_position="last")

    total_count = int(len(result))
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    start = (page - 1) * page_size
    page_rows = result.iloc[start : start + page_size]

    hospitals = [store.hospital_summary_row(row) for _, row in page_rows.iterrows()]

    return {
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "hospitals": hospitals,
    }


@router.get("/{provider_id}")
def hospital_detail(request: Request, provider_id: str) -> dict[str, Any]:
    provider_id = _sanitize_provider_id(provider_id)
    profile = _store(request).get_hospital_by_id(provider_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Hospital {provider_id} not found")
    # Strip private helper keys used internally by the simulator.
    return {k: v for k, v in profile.items() if not k.startswith("_")}


@router.get("/{provider_id}/similar")
def similar_hospitals(request: Request, provider_id: str) -> dict[str, Any]:
    provider_id = _sanitize_provider_id(provider_id)
    store = _store(request)
    if store.get_hospital_by_id(provider_id) is None:
        raise HTTPException(status_code=404, detail=f"Hospital {provider_id} not found")
    return {"provider_id": provider_id, "similar": store.get_similar_hospitals(provider_id, limit=5)}
