"""Deterministic eligibility engine.

The LLM never decides eligibility. It only collects profile facts; this module compares
them against criteria that were copied (with verbatim quotes) from official sources.
"""
from __future__ import annotations

from typing import Any

POTENTIALLY_ELIGIBLE = "Potentially Eligible"
NOT_ELIGIBLE = "Not Eligible Based on Known Rules"
NEED_INFO = "More Information Needed"

DISCLAIMER = ("Guidance only, based on officially published criteria stored on the shown date. "
              "Final eligibility is decided by the scheme authority after official verification.")

EDUCATION_LEVELS = ["none", "primary", "middle", "matric", "intermediate", "undergraduate", "graduate", "postgraduate"]

PUNJAB_DISTRICTS = {
    "attock", "bahawalnagar", "bahawalpur", "bhakkar", "chakwal", "chiniot", "dera ghazi khan", "dg khan",
    "faisalabad", "gujranwala", "gujrat", "hafizabad", "jhang", "jhelum", "kasur", "khanewal", "khushab",
    "kot addu", "lahore", "layyah", "lodhran", "mandi bahauddin", "mianwali", "multan", "murree",
    "muzaffargarh", "nankana sahib", "narowal", "okara", "pakpattan", "rahim yar khan", "rajanpur",
    "rawalpindi", "sahiwal", "sargodha", "sheikhupura", "sialkot", "talagang", "taunsa", "toba tek singh",
    "vehari", "wazirabad",
}

# Profile fields the agent may collect. Deliberately excludes CNIC, phone, bank and address data.
PROFILE_FIELDS: dict[str, dict[str, Any]] = {
    "age": {"type": "int", "question": "What is your age (in years)?"},
    "gender": {"type": "enum", "values": ["male", "female", "transgender"], "question": "What is your gender?"},
    "province": {"type": "str", "question": "Which province do you permanently live in (domicile)?"},
    "district": {"type": "str", "question": "Which district do you live in?"},
    "area_type": {"type": "enum", "values": ["urban", "rural"], "question": "Do you live in an urban or rural area?"},
    "education_level": {"type": "enum", "values": EDUCATION_LEVELS,
                        "question": "What is your current or highest education level (e.g. matric, intermediate, university)?"},
    "currently_enrolled": {"type": "bool", "question": "Are you currently enrolled in a school, college or university?"},
    "current_semester": {"type": "int", "question": "Which semester of your degree are you in (e.g. 1, 2, 3)?"},
    "institution_type": {"type": "enum", "values": ["public", "private"],
                         "question": "Is your school/college/university public (government) or private?"},
    "intermediate_marks_percent": {"type": "float", "question": "What percentage of marks did you get in Intermediate (FSc/FA/ICS)?"},
    "received_laptop_before": {"type": "bool", "question": "Have you ever received a laptop from any government laptop scheme?"},
    "has_driving_licence": {"type": "bool", "question": "Do you hold a valid motorcycle learner's permit or driving licence?"},
    "marital_status": {"type": "enum", "values": ["single", "married", "widowed", "divorced"],
                       "question": "What is your marital status?"},
    "monthly_household_income": {"type": "int", "question": "Roughly what is your family's total monthly income in PKR?"},
    "employment_type": {"type": "enum",
                        "values": ["student", "industrial_worker", "domestic_worker", "farmer", "daily_wage",
                                   "self_employed", "private_employee", "government_employee", "unemployed", "other"],
                        "question": "What is your (or the main earner's) type of work?"},
    "registered_with_pessi": {"type": "bool",
                              "question": "Are you (or your parent) a worker registered/secured with PESSI (Punjab Employees Social Security)?"},
    "registered_industrial_worker": {"type": "bool",
                                     "question": "Are you (or your parent) a registered industrial worker (Punjab Workers Welfare Fund)?"},
    "bisp_beneficiary": {"type": "bool", "question": "Is your household an active BISP (Benazir Kafaalat) beneficiary?"},
    "owns_plot": {"type": "bool", "question": "Do you own a residential plot or house?"},
    "plot_size_marla": {"type": "float", "question": "What is the size of your plot/house in marla?"},
    "land_acres": {"type": "float", "question": "How many acres of agricultural land do you own?"},
    "has_disability": {"type": "bool", "question": "Do you have a disability certificate?"},
}


def normalize_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Clean types and derive province from a Punjab district."""
    out: dict[str, Any] = {}
    for key, value in (profile or {}).items():
        if key not in PROFILE_FIELDS or value is None or value == "":
            continue
        kind = PROFILE_FIELDS[key]["type"]
        try:
            if kind == "int":
                value = int(float(value))
            elif kind == "float":
                value = float(value)
            elif kind == "bool":
                value = value if isinstance(value, bool) else str(value).strip().lower() in {"true", "yes", "1", "haan", "ha", "ji"}
            else:
                value = str(value).strip().lower()
        except (TypeError, ValueError):
            continue
        if kind == "enum" and value not in PROFILE_FIELDS[key]["values"]:
            continue
        out[key] = value
    district = out.get("district")
    if district:
        out["district"] = district.title() if district != "dg khan" else "Dera Ghazi Khan"
        if district in PUNJAB_DISTRICTS and "province" not in out:
            out["province"] = "punjab"
    if "province" in out:
        out["province"] = out["province"].replace("the ", "").strip()
    return out


def _compare(op: str, user_value: Any, rule_value: Any, field: str) -> bool:
    if field == "education_level":
        idx = EDUCATION_LEVELS.index
        if op in ("gte", "lte"):
            a, b = idx(user_value), idx(rule_value)
            return a >= b if op == "gte" else a <= b
    if isinstance(user_value, str):
        user_value = user_value.lower()
        rule_value = [v.lower() for v in rule_value] if isinstance(rule_value, list) else (
            rule_value.lower() if isinstance(rule_value, str) else rule_value)
    if op == "eq":
        return user_value == rule_value
    if op == "in":
        return user_value in rule_value
    if op == "not_in":
        return user_value not in rule_value
    if op == "between":
        return rule_value[0] <= user_value <= rule_value[1]
    if op == "lt":
        return user_value < rule_value
    if op == "gt":
        return user_value > rule_value
    if op == "lte":
        return user_value <= rule_value
    if op == "gte":
        return user_value >= rule_value
    if op == "is_true":
        return user_value is True
    if op == "is_false":
        return user_value is False
    raise ValueError(f"Unknown operator {op}")


def evaluate_criterion(criterion: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    field, op = criterion.get("field"), criterion["op"]
    result = {
        "id": criterion["criterion_id"] if "criterion_id" in criterion else criterion["id"],
        "label": criterion["label"],
        "field": field,
        "required": criterion.get("value"),
        "user_value": profile.get(field) if field else None,
        "quote": criterion.get("quote"),
        "source_url": criterion.get("source_url"),
    }
    when = criterion.get("when")
    if isinstance(when, dict):
        cond_field = when["field"]
        if cond_field not in profile:
            return {**result, "status": "unknown", "missing_field": cond_field}
        if not _compare(when.get("op", "eq"), profile[cond_field], when["value"], cond_field):
            return {**result, "status": "not_applicable"}
    if op == "manual" or not field:
        return {**result, "status": "manual"}
    if field not in profile:
        return {**result, "status": "unknown", "missing_field": field}
    return {**result, "status": "pass" if _compare(op, profile[field], criterion.get("value"), field) else "fail"}


def check_scheme(scheme: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    profile = normalize_profile(profile)
    criteria = scheme.get("criteria") or []
    evaluated = [evaluate_criterion(c, profile) for c in criteria]
    missing = list(dict.fromkeys(e["missing_field"] for e in evaluated if e["status"] == "unknown"))
    warnings: list[str] = []

    if not criteria:
        verdict = NEED_INFO
        warnings.append("No officially verified eligibility criteria are stored for this scheme yet. "
                        "Check the official source before applying.")
    elif any(e["status"] == "fail" for e in evaluated):
        verdict = NOT_ELIGIBLE
    elif missing:
        verdict = NEED_INFO
    else:
        verdict = POTENTIALLY_ELIGIBLE

    if scheme.get("rules_status") == "needs_reverification":
        warnings.append("The official source changed after these rules were verified. Rules are pending re-verification.")
    if any(e["status"] == "manual" for e in evaluated):
        warnings.append("Some conditions can only be confirmed by the scheme authority (marked 'official check').")

    return {
        "scheme_id": scheme["id"],
        "scheme_name": scheme["name"],
        "level": scheme.get("level"),
        "category": scheme.get("category"),
        "verdict": verdict,
        "criteria": evaluated,
        "missing_fields": missing,
        "questions": [PROFILE_FIELDS[f]["question"] for f in missing if f in PROFILE_FIELDS],
        "failed": [e["label"] for e in evaluated if e["status"] == "fail"],
        "rules_status": scheme.get("rules_status"),
        "last_verified": scheme.get("last_verified"),
        "source_url": scheme.get("source_url"),
        "warnings": warnings,
        "disclaimer": DISCLAIMER,
    }
