"""Extract plain text from uploaded CVs (PDF or DOCX), with OCR fallback."""
from __future__ import annotations

import io
import os
import re
import tempfile
from typing import Optional

import mammoth
from PyPDF2 import PdfReader


def _ocr_pdf(pdf_bytes: bytes) -> str:
    """Fallback OCR for scanned PDFs. Returns empty string if tools missing."""
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except Exception:
        return ""

    try:
        images = convert_from_bytes(pdf_bytes, dpi=150)
    except Exception:
        return ""

    parts = []
    for img in images:
        try:
            parts.append(pytesseract.image_to_string(img))
        except Exception:
            continue
    return "\n".join(parts)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text_parts: list[str] = []
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            text_parts.append(page.extract_text() or "")
    except Exception:
        pass

    text = "\n".join(text_parts).strip()
    if len(text) < 50:
        ocr = _ocr_pdf(pdf_bytes)
        if ocr.strip():
            return ocr
    return text


def extract_text_from_docx(docx_bytes: bytes) -> str:
    try:
        result = mammoth.extract_raw_text(io.BytesIO(docx_bytes))
        return result.value
    except Exception:
        return ""


def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return extract_text_from_pdf(data)
    if name.endswith(".docx"):
        return extract_text_from_docx(data)
    # Try to sniff
    if data[:4] == b"%PDF":
        return extract_text_from_pdf(data)
    return extract_text_from_docx(data)


EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")
LINKEDIN_RE = re.compile(r"(https?://)?(www\.)?linkedin\.com/[^\s,;]+", re.I)


def sniff_contacts(text: str) -> dict:
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    linkedin = LINKEDIN_RE.search(text)
    return {
        "email": email.group(0) if email else "",
        "phone": phone.group(0).strip() if phone else "",
        "linkedin": linkedin.group(0) if linkedin else "",
    }
