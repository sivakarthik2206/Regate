from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    total_hospitals: int = Field(..., ge=0)
    total_records: int = Field(..., ge=0)
