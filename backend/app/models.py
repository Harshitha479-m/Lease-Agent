from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Lease(Base):
    __tablename__ = "leases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(32), default="processed")
    tenant_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    property_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    property_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lease_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    lease_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    monthly_rent: Mapped[float | None] = mapped_column(Float, nullable=True)
    renewal_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    notice_period: Mapped[str | None] = mapped_column(String(255), nullable=True)
    escalation: Mapped[str | None] = mapped_column(Text, nullable=True)
    maintenance: Mapped[str | None] = mapped_column(Text, nullable=True)
    compliance: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
