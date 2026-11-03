"""Masks sensitive identifiers before text reaches the LLM, the logs or the database."""
from __future__ import annotations

import re

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("IBAN", re.compile(r"\bPK\d{2}\s?[A-Z]{4}(?:\s?\d){16}\b", re.I)),
    ("CNIC", re.compile(r"\b\d{5}[-\s]?\d{7}[-\s]?\d\b")),
    ("phone number", re.compile(r"(?:\+92[-\s]?|\b0)3\d{2}[-\s]?\d{7}\b")),
    ("card number", re.compile(r"\b(?:\d[ -]?){15,18}\d\b")),
    ("bank account number", re.compile(r"\b(?:account|acct|a/c)\s*(?:no\.?|number|#)?\s*[:\-]?\s*\d[\d\s-]{7,}\d\b", re.I)),
    ("email address", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
]


def mask_sensitive(text: str) -> tuple[str, list[str]]:
    """Return (masked_text, list of identifier types that were removed)."""
    found: list[str] = []
    for label, pattern in _PATTERNS:
        if pattern.search(text):
            found.append(label)
            text = pattern.sub(f"[{label.upper()} REMOVED]", text)
    return text, found
