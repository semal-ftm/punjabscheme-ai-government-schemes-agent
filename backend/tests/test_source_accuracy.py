"""Source accuracy of the real, human-verified rules (backend/data/rules.yaml).

Every quoted rule must appear verbatim in the saved snapshot of its official page, every link must be an
official domain, and no date/status may be asserted without evidence. Runs offline from snapshots.
"""
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import pytest
import yaml

from app.crawler.crawler import normalize_url, snapshot_text

DATA = Path(__file__).resolve().parent.parent / "data"
RULES = yaml.safe_load((DATA / "rules.yaml").read_text(encoding="utf-8"))["schemes"]
MANIFEST = json.loads((DATA / "snapshots" / "manifest.json").read_text(encoding="utf-8"))
OFFICIAL = re.compile(r"(^|\.)(gov\.pk|gop\.pk)$")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("’", "'").replace("‘", "'")).strip().lower()


@pytest.fixture(scope="module")
def snapshot_texts():
    from app import config
    assert config.DATA_DIR == DATA
    return {normalize_url(e["url"]): _norm(snapshot_text(e)) for e in MANIFEST}


def _quoted_items():
    for s in RULES:
        for c in s.get("criteria", []):
            yield s, "criterion", c
        for kind in ("benefits", "documents", "steps"):
            for item in s.get(kind, []):
                yield s, kind, item


def test_enough_verified_schemes_across_all_three_categories():
    assert len(RULES) >= 8
    assert {s["category"] for s in RULES} == {"cm_punjab", "punjab_department", "federal"}
    assert all(s["criteria"] for s in RULES)


@pytest.mark.parametrize("scheme,kind,item", list(_quoted_items()),
                         ids=lambda v: v["id"] if isinstance(v, dict) and "id" in v else None)
def test_every_quote_appears_verbatim_in_official_snapshot(snapshot_texts, scheme, kind, item):
    if not item.get("quote"):
        pytest.skip("no quote")
    url = normalize_url(item.get("source_url") or scheme["source_url"])
    assert url in snapshot_texts, f"no saved snapshot for {url}"
    assert _norm(item["quote"]) in snapshot_texts[url], f"{scheme['id']} {kind}: quote not found in {url}"


def test_all_links_are_official_domains():
    for s in RULES:
        urls = [s["source_url"], s.get("application_url"), s.get("status_source_url")]
        urls += [i.get("source_url") for _, _, i in _quoted_items()]
        for u in filter(None, urls):
            assert OFFICIAL.search(urlparse(u).netloc), f"{s['id']}: non-official link {u}"


def test_no_status_or_date_without_evidence():
    for s in RULES:
        if s.get("deadline") or s.get("opening_date") or s.get("status", "Unverified") != "Unverified":
            assert s.get("status_quote"), f"{s['id']}: status/date asserted without an official quote"
            assert s.get("status_source_url"), f"{s['id']}: status quote has no official source page"
            assert s.get("status_checked"), f"{s['id']}: status evidence has no check date"


@pytest.mark.parametrize("scheme", [s for s in RULES if s.get("status_quote")], ids=lambda s: s["id"])
def test_status_quote_appears_verbatim_in_official_snapshot(snapshot_texts, scheme):
    url = normalize_url(scheme.get("status_source_url") or scheme["source_url"])
    assert url in snapshot_texts, f"no saved snapshot for {url}"
    assert _norm(scheme["status_quote"]) in snapshot_texts[url], f"{scheme['id']}: status quote not found in {url}"


def test_most_verified_schemes_have_official_status_evidence():
    with_evidence = [s["id"] for s in RULES if s.get("status", "Unverified") != "Unverified"]
    assert len(with_evidence) >= len(RULES) * 0.75, with_evidence


def test_federal_and_provincial_are_labelled_consistently():
    for s in RULES:
        assert (s["category"] == "federal") == (s["level"] == "federal"), s["id"]
