from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.model_store import AVG_MEDICARE_REVENUE_USD, ModelStore, _f

router = APIRouter(prefix="/batch", tags=["batch"])


def _store(request: Request) -> ModelStore:
    return request.app.state.model_store


class BatchRequest(BaseModel):
    provider_ids: list[str] = Field(default_factory=list, max_length=200)


@router.post("/analyze")
def analyze(request: Request, body: BatchRequest) -> dict[str, Any]:
    store = _store(request)
    if not body.provider_ids:
        raise HTTPException(status_code=422, detail="provider_ids must not be empty")
    if len(body.provider_ids) > 200:
        raise HTTPException(status_code=422, detail="maximum of 200 provider_ids per request")

    found_rows = []
    not_found = []
    for pid in body.provider_ids:
        profile = store.get_hospital_by_id(pid)
        if profile is None:
            not_found.append(pid)
            continue
        found_rows.append(profile)

    hospitals = []
    for p in found_rows:
        top_cond = None
        best = -1.0
        for c in p["condition_breakdown"]:
            err = c.get("excess_readmission_ratio")
            if err is not None and err > best:
                best = err
                top_cond = c["condition"]
        hospitals.append(
            {
                "provider_id": p["provider_id"],
                "name": p["name"],
                "state": p["state"],
                "risk_score": p["risk_score"],
                "risk_tier": p["risk_tier"],
                "penalty_pct": p["penalty_pct"],
                "estimated_penalty_usd": p["estimated_penalty_usd"],
                "top_risk_condition": top_cond,
            }
        )
    hospitals.sort(key=lambda h: h["risk_score"] if h["risk_score"] is not None else -1, reverse=True)

    penalized_count = sum(1 for p in found_rows if p["penalized"])
    penalties = [p["penalty_pct"] for p in found_rows if _f(p["penalty_pct"]) is not None]
    avg_penalty = round(sum(penalties) / len(penalties), 4) if penalties else 0.0
    total_est = round(sum(_f(p["estimated_penalty_usd"]) or 0.0 for p in found_rows), 0)

    highest = hospitals[0] if hospitals else None
    lowest = hospitals[-1] if hospitals else None

    portfolio = {
        "total_hospitals": len(found_rows),
        "penalized_count": penalized_count,
        "avg_penalty_pct": avg_penalty,
        "total_estimated_penalties_usd": total_est,
        "highest_risk": {
            "provider_id": highest["provider_id"],
            "name": highest["name"],
            "risk_score": highest["risk_score"],
        }
        if highest
        else None,
        "lowest_risk": {
            "provider_id": lowest["provider_id"],
            "name": lowest["name"],
            "risk_score": lowest["risk_score"],
        }
        if lowest
        else None,
    }

    return {
        "total_submitted": len(body.provider_ids),
        "found": len(found_rows),
        "not_found": not_found,
        "portfolio_summary": portfolio,
        "hospitals": hospitals,
    }
