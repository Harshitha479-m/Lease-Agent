from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class LeaseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    file_name: str
    tenant_name: str | None
    property_name: str | None
    lease_start: date | None
    lease_end: date | None
    monthly_rent: float | None
    status: str
    created_at: datetime


class LeaseDetail(LeaseSummary):
    property_address: str | None
    renewal_terms: str | None
    notice_period: str | None
    escalation: str | None
    maintenance: str | None
    compliance: str | None


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    sources: list[str]


class DashboardStats(BaseModel):
    total_leases: int
    expiring_soon: int
    renewal_watch: int
    processed_this_month: int
