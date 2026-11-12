"""Eligibility rule engine, scheme status/deadlines and privacy masking."""
from datetime import date

from app import db
from app.agent.privacy import mask_sensitive
from app.eligibility import (NEED_INFO, NOT_ELIGIBLE, POTENTIALLY_ELIGIBLE, PROFILE_FIELDS, check_scheme,
                             normalize_profile)
from app.rules_loader import effective_status


def _laptop(seeded_db):
    with db.session() as conn:
        return db.get_scheme(conn, "test-university-laptop")


def test_district_implies_punjab_and_types_are_cleaned():
    p = normalize_profile({"district": "lahore", "age": "21", "currently_enrolled": "yes", "cnic": "123"})
    assert p == {"district": "Lahore", "province": "punjab", "age": 21, "currently_enrolled": True}


def test_profile_fields_never_include_identity_data():
    assert not {"cnic", "phone", "iban", "bank_account", "address"} & set(PROFILE_FIELDS)


def test_potentially_eligible_when_all_rules_pass(seeded_db):
    r = check_scheme(_laptop(seeded_db), {"district": "Lahore", "education_level": "undergraduate",
                                          "area_type": "rural"})
    assert r["verdict"] == POTENTIALLY_ELIGIBLE
    statuses = {c["id"]: c["status"] for c in r["criteria"]}
    assert statuses == {"domicile": "pass", "education": "pass", "plot": "not_applicable", "record": "manual"}
    assert any("official" in w.lower() for w in r["warnings"])  # manual check is disclosed


def test_not_eligible_names_the_failed_rule_and_quote(seeded_db):
    r = check_scheme(_laptop(seeded_db), {"district": "Lahore", "education_level": "matric", "area_type": "rural"})
    assert r["verdict"] == NOT_ELIGIBLE
    failed = [c for c in r["criteria"] if c["status"] == "fail"]
    assert failed[0]["id"] == "education" and "BS, MS or PhD" in failed[0]["quote"]


def test_missing_information_produces_only_needed_questions(seeded_db):
    r = check_scheme(_laptop(seeded_db), {"district": "Lahore"})
    assert r["verdict"] == NEED_INFO
    assert r["missing_fields"] == ["education_level", "area_type"]
    assert "province" not in r["missing_fields"]  # derived from district, never re-asked


def test_conditional_rule_applies_only_when_condition_holds(seeded_db):
    base = {"district": "Lahore", "education_level": "graduate", "area_type": "urban"}
    assert check_scheme(_laptop(seeded_db), {**base, "plot_size_marla": 4})["verdict"] == POTENTIALLY_ELIGIBLE
    assert check_scheme(_laptop(seeded_db), {**base, "plot_size_marla": 8})["verdict"] == NOT_ELIGIBLE


def test_scheme_without_verified_rules_is_never_eligible():
    r = check_scheme({"id": "x", "name": "Discovered", "criteria": [], "rules_status": "not_curated"}, {"age": 20})
    assert r["verdict"] == NEED_INFO and r["warnings"]


def test_status_requires_confirmed_dates():
    assert effective_status({"status": "Open"}) == "Unverified"  # no evidence, no dates
    assert effective_status({"opening_date": "2026-01-01", "deadline": "2026-02-01"}, date(2026, 1, 15)) == "Open"
    assert effective_status({"opening_date": "2026-01-01", "deadline": "2026-02-01"}, date(2026, 3, 1)) == "Closed"
    assert effective_status({"opening_date": "2026-05-01", "deadline": "2026-06-01"}, date(2026, 3, 1)) == "Upcoming"
    assert effective_status({"status": "Suspended", "status_quote": "Registration suspended."}) == "Suspended"
    assert effective_status({"deadline": "not-a-date"}) == "Unverified"


def test_privacy_guard_masks_identifiers():
    text = ("My CNIC is 35202-1234567-1, phone 0300-1234567, IBAN PK36SCBL0000001123456702 "
            "and email ali@example.com")
    masked, found = mask_sensitive(text)
    assert "35202" not in masked and "0300" not in masked and "PK36" not in masked and "@" not in masked
    assert {"CNIC", "phone number", "IBAN", "email address"} <= set(found)
    assert mask_sensitive("I am 21 and live in Lahore")[1] == []
