from __future__ import annotations

import csv
import io
import re
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from api.model_store import ModelStore


def _safe_filename(provider_id: str) -> str:
    """Sanitize provider_id for use in Content-Disposition filename."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", provider_id)[:30]

router = APIRouter(prefix="/export", tags=["export"])


def _store(request: Request) -> ModelStore:
    return request.app.state.model_store


class BatchExportRequest(BaseModel):
    provider_ids: list[str] = Field(default_factory=list, max_length=200)


def _profile_rows(profile: dict[str, Any]) -> list[tuple[str, Any]]:
    rows = [
        ("Provider ID", profile["provider_id"]),
        ("Name", profile["name"]),
        ("City", profile["city"]),
        ("State", profile["state"]),
        ("ZIP", profile["zip"]),
        ("County", profile["county"]),
        ("Phone", profile["phone"]),
        ("Hospital Type", profile["hospital_type"]),
        ("Ownership Type", profile["ownership_type"]),
        ("Emergency Services", profile["emergency_services"]),
        ("Star Rating", profile["star_rating"]),
        ("Penalized", profile["penalized"]),
        ("Penalty Pct", profile["penalty_pct"]),
        ("Penalty Tier", profile["penalty_tier"]),
        ("Risk Score", profile["risk_score"]),
        ("Risk Tier", profile["risk_tier"]),
        ("Estimated Penalty USD", profile["estimated_penalty_usd"]),
    ]
    for c in profile["condition_breakdown"]:
        rows.append(
            (
                f"{c['condition']} Readmission Rate",
                f"{c['readmission_rate']} (nat {c['national_avg']}, {c['compared_to_national']})",
            )
        )
    return rows


@router.get("/hospital/{provider_id}/csv")
def export_hospital_csv(request: Request, provider_id: str) -> StreamingResponse:
    profile = _store(request).get_hospital_by_id(provider_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Hospital {provider_id} not found")

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Field", "Value"])
    for field, value in _profile_rows(profile):
        writer.writerow([field, value])
    buffer.seek(0)
    filename = f"hospital_{_safe_filename(provider_id)}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/hospital/{provider_id}/pdf")
def export_hospital_pdf(request: Request, provider_id: str) -> Response:
    profile = _store(request).get_hospital_by_id(provider_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Hospital {provider_id} not found")

    from datetime import date

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    safe_id = _safe_filename(provider_id)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title=f"Regate Report {safe_id}")
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"Regate Penalty Risk Report", styles["Title"]))
    story.append(Paragraph(profile["name"] or "Unknown Hospital", styles["Heading2"]))
    loc = ", ".join(x for x in [profile["city"], profile["state"], profile["zip"]] if x)
    story.append(Paragraph(f"{loc}", styles["Normal"]))
    story.append(Paragraph(f"Provider ID: {profile['provider_id']}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(
        Paragraph(
            f"Overall Risk Score: <b>{profile['risk_score']}</b> "
            f"(tier: {profile['risk_tier']}) &nbsp;&nbsp; "
            f"Penalty: <b>{profile['penalty_pct']}%</b> ({profile['penalty_tier']}) &nbsp;&nbsp; "
            f"Est. Impact: <b>${profile['estimated_penalty_usd']:,.0f}</b>",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    # Condition breakdown table.
    story.append(Paragraph("Condition Breakdown", styles["Heading3"]))
    cond_data = [["Condition", "Rate", "National", "Compared", "ERR", "Contribution %"]]
    for c in profile["condition_breakdown"]:
        cond_data.append(
            [
                c["condition_name"],
                c["readmission_rate"],
                c["national_avg"],
                c["compared_to_national"],
                c["excess_readmission_ratio"],
                c["risk_contribution_pct"],
            ]
        )
    table = Table(cond_data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.2 * inch))

    # Risk factors.
    story.append(Paragraph("Risk Factors", styles["Heading3"]))
    for rf in profile["risk_factors"]:
        story.append(
            Paragraph(
                f"- <b>{rf['factor']}</b> ({rf['impact']}): {rf['value']} - {rf['description']}",
                styles["Normal"],
            )
        )
    story.append(Spacer(1, 0.15 * inch))

    # Recommendations.
    story.append(Paragraph("Recommendations", styles["Heading3"]))
    for rec in profile["recommendations"]:
        story.append(Paragraph(f"- {rec}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))

    # Peer comparison.
    peer = profile["peer_comparison"]
    story.append(Paragraph("Peer Comparison", styles["Heading3"]))
    story.append(
        Paragraph(
            f"Peer group: {peer['peer_group']} ({peer['peer_count']} hospitals). "
            f"Percentile: {peer['percentile']}. "
            f"Peer avg penalty: {peer['peer_avg_penalty_pct']}%, "
            f"peer avg readmission: {peer['peer_avg_readmission_rate']}%.",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(f"Generated: {date.today().isoformat()}", styles["Italic"]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="hospital_{safe_id}.pdf"'},
    )


@router.post("/batch/csv")
def export_batch_csv(request: Request, body: BatchExportRequest) -> StreamingResponse:
    store = _store(request)
    if not body.provider_ids:
        raise HTTPException(status_code=422, detail="provider_ids must not be empty")

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "provider_id",
            "name",
            "city",
            "state",
            "ownership_type",
            "star_rating",
            "penalized",
            "penalty_pct",
            "penalty_tier",
            "risk_score",
            "risk_tier",
            "estimated_penalty_usd",
        ]
    )
    for pid in body.provider_ids:
        p = store.get_hospital_by_id(pid)
        if p is None:
            writer.writerow([pid, "NOT FOUND", "", "", "", "", "", "", "", "", "", ""])
            continue
        writer.writerow(
            [
                p["provider_id"],
                p["name"],
                p["city"],
                p["state"],
                p["ownership_type"],
                p["star_rating"],
                p["penalized"],
                p["penalty_pct"],
                p["penalty_tier"],
                p["risk_score"],
                p["risk_tier"],
                p["estimated_penalty_usd"],
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="batch_hospitals.csv"'},
    )
