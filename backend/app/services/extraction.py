import re
from datetime import date
from pathlib import Path

from pypdf import PdfReader

from ..config import get_settings


FIELD_PATTERNS = {
    "tenant_name": [r"(?:tenant|lessee|occupant)\s*[:\-]\s*([^\n]+)"],
    "property_name": [r"(?:property|premises|building)\s*[:\-]\s*([^\n]+)"],
    "property_address": [r"(?:address|location)\s*[:\-]\s*([^\n]+)"],
    "notice_period": [r"(?:notice period|notice)\s*[:\-]\s*([^\n]+)"],
    "renewal_terms": [r"(?:renewal|option to renew)\s*[:\-]\s*([^\n]+)"],
    "escalation": [r"(?:escalation|rent increase)\s*[:\-]\s*([^\n]+)"],
    "maintenance": [r"(?:maintenance|repairs)\s*[:\-]\s*([^\n]+)"],
    "compliance": [r"(?:compliance|regulatory)\s*[:\-]\s*([^\n]+)"],
}


def _first_match(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip(" .;\t")
            return value or None
    return None


def _parse_date(text: str, labels: list[str]) -> date | None:
    label_pattern = "|".join(labels)
    match = re.search(rf"(?:{label_pattern})\s*[:\-]?\s*(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}}|\d{{4}}[/-]\d{{1,2}}[/-]\d{{1,2}})", text, re.I)
    if not match:
        return None
    raw = match.group(1).replace("/", "-")
    parts = raw.split("-")
    try:
        if len(parts[0]) == 4:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        year = int(parts[2]) + (2000 if int(parts[2]) < 100 else 0)
        return date(year, int(parts[1]), int(parts[0]))
    except ValueError:
        return None


def _parse_rent(text: str) -> float | None:
    match = re.search(r"(?:monthly rent|base rent|rent)\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)", text, re.I)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def extract_text(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if text or not get_settings().ocr_enabled:
        return text
    # OCR is intentionally optional: deployment images can install Tesseract and enable it.
    try:
        import pytesseract
        from pdf2image import convert_from_path

        pages = convert_from_path(file_path)
        return "\n".join(pytesseract.image_to_string(page) for page in pages).strip()
    except (ImportError, OSError):
        return ""


def extract_fields(text: str) -> dict:
    return {
        "tenant_name": _first_match(text, FIELD_PATTERNS["tenant_name"]),
        "property_name": _first_match(text, FIELD_PATTERNS["property_name"]),
        "property_address": _first_match(text, FIELD_PATTERNS["property_address"]),
        "lease_start": _parse_date(text, ["lease start", "commencement", "start date"]),
        "lease_end": _parse_date(text, ["lease end", "expiration", "expiry", "end date"]),
        "monthly_rent": _parse_rent(text),
        "renewal_terms": _first_match(text, FIELD_PATTERNS["renewal_terms"]),
        "notice_period": _first_match(text, FIELD_PATTERNS["notice_period"]),
        "escalation": _first_match(text, FIELD_PATTERNS["escalation"]),
        "maintenance": _first_match(text, FIELD_PATTERNS["maintenance"]),
        "compliance": _first_match(text, FIELD_PATTERNS["compliance"]),
    }


def process_pdf(file_path: str) -> tuple[str, dict]:
    text = extract_text(file_path)
    return text, extract_fields(text)
