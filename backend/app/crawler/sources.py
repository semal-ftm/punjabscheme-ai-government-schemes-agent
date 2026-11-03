"""Registry of official sources the crawler is allowed to visit.

Only these seeds (and links on the same official host) are crawled. Each source declares
which links are worth following so the crawler stays small and polite.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    seeds: tuple[str, ...]
    category: str            # cm_punjab | punjab_department | federal
    level: str               # provincial | federal
    department: str
    follow: tuple[str, ...] = ()        # substrings a link URL or text must contain to be followed
    card_selector: str | None = None    # CSS selector for scheme cards on listing pages
    card_category_selector: str | None = None
    max_depth: int = 1
    follow_pdfs: bool = True
    max_pages: int | None = None        # overrides CRAWL_MAX_PAGES_PER_SOURCE
    exclude: tuple[str, ...] = ()       # source-specific link text/URL fragments never to follow
    extra: dict = field(default_factory=dict)


SOURCES: tuple[Source, ...] = (
    Source(
        id="punjab_flagship",
        name="Government of the Punjab - Flagship Initiatives",
        seeds=tuple(f"https://punjab.gov.pk/flagship-projects?page={i}" for i in range(5)),
        category="cm_punjab", level="provincial", department="Government of the Punjab (CM Initiatives)",
        card_selector="a.initiative-wrap", card_category_selector=".init-category", max_pages=70,
    ),
    Source(
        id="agri_cm_initiatives",
        name="Agriculture Department Punjab - CM Initiatives",
        seeds=("https://www.agripunjab.gov.pk/agri-adp-cminitiatives",),
        category="cm_punjab", level="provincial", department="Agriculture Department, Punjab",
        follow=("cminitiative", "kissan", "tractor", "scheme", "card", "subsid", "programme", "program"),
    ),
    Source(
        id="punjab_autonomous_bodies",
        name="Government of the Punjab - Autonomous Bodies Directory",
        seeds=("https://punjab.gov.pk/autonomous-bodies",),
        category="punjab_department", level="provincial", department="Government of the Punjab",
        max_depth=0, follow_pdfs=False,
    ),
    Source(
        id="pspa",
        name="Punjab Social Protection Authority (PSPA)",
        seeds=("https://pspa.punjab.gov.pk/",),
        category="punjab_department", level="provincial", department="Punjab Social Protection Authority",
        follow=("programme", "program", "scheme", "card", "himmat", "nigehban", "rahmat", "stipend",
                "allowance", "scholar", "initiative", "eligib", "apply", "pension"),
    ),
    Source(
        id="pessi",
        name="Punjab Employees Social Security Institution (PESSI)",
        seeds=("https://pessi.punjab.gov.pk/",),
        category="punjab_department", level="provincial", department="Punjab Employees Social Security Institution",
        follow=("healthcare", "cash_benefits", "initiatives", "ration", "registration", "domestic", "hajj", "benefit"),
    ),
    # pwwb.com.pk was requested as a source but is NOT a government site (SEO content, contradicts
    # punjab.gov.pk). The official Punjab Workers Welfare Fund site is used instead.
    Source(
        id="pwwf",
        name="Punjab Workers Welfare Fund (PWWF)",
        seeds=("https://pwwf.punjab.gov.pk/",),
        category="punjab_department", level="provincial", department="Punjab Workers Welfare Fund (Labour Dept.)",
        follow=("scholarship", "education", "welfare", "marriage", "death", "grant", "scheme", "talent",
                "housing", "stipend", "functions", "ww_hs_schools"),
    ),
    Source(
        id="bisp",
        name="Benazir Income Support Programme (BISP)",
        seeds=("https://bisp.gov.pk/",),
        category="federal", level="federal", department="Benazir Income Support Programme (Federal)",
        follow=("/detail/", "kafaalat", "kifalat", "taleemi", "nashonuma", "nashonoma", "undergraduate",
                "registration process", "eligib"),
        exclude=("press", "gallery", "board", "council", "testimonial", "video", "news", "organogram",
                 "evaluation", "procure"),
        max_pages=50,
    ),
    Source(
        id="pbm",
        name="Pakistan Bait-ul-Mal (PBM)",
        seeds=("https://www.pbm.gov.pk/projects.html",),
        category="federal", level="federal", department="Pakistan Bait-ul-Mal (Federal)",
        follow=("project", "scheme", "assistance", "education", "program"),
    ),
    Source(
        id="wwf",
        name="Workers Welfare Fund (WWF)",
        seeds=("https://www.wwf.gov.pk/",),
        category="federal", level="federal", department="Workers Welfare Fund (Federal)",
        follow=("scholarship", "grant", "scheme", "marriage", "death", "education", "housing"),
    ),
)

SOURCES_BY_ID = {s.id: s for s in SOURCES}

# Page or link text that marks content as scheme-related.
SCHEME_KEYWORDS = (
    "eligib", "criteria", "apply", "applicant", "benefit", "scholarship", "stipend", "grant", "loan",
    "card", "programme", "program", "scheme", "registration", "required documents", "documents required",
    "cnic", "deadline", "last date", "assistance", "beneficiar", "allowance", "subsidy", "wazaif",
    "kafaalat", "nashonuma", "financing", "interest-free", "relief", "support", "admission", "free of cost",
    "free education", "welfare",
)
# Content we never treat as a scheme (procurement notices, HR, governance documents...).
EXCLUDE_KEYWORDS = (
    "tender", "procurement", "bid ", "bidding", "evaluation report", "recruitment", "vacanc", "job ",
    "advertisement", "organogram", "conduct regulation", "service regulation", "financial regulation",
    "board committee", "committees of", "rfq", "firewall", "bandwidth", "printing", "annual report",
    "conflict of interest", "audit", "testimonial", "contribution certificate", "medical fitness",
    "declaration form for employer", "job application", "seniority list", "undelivered cheques",
    "teacher intern",
)
NEWS_WORDS = ("visit", "meeting", "reviews", "review of", "delivers", "inaugurat", "chaired", "held", "says",
              "ceremony", "fleet active", "top priority", "dashboard", "lab report")
SCHEME_TITLE_WORDS = ("card", "programme", "program", "scheme", "scholarship", "loan", "grant", "initiative",
                      "fund", "benefit", "wazaif", "kafaalat", "nashonuma", "chhat", "relief", "assistance",
                      "allowance", "stipend", "tractor", "service", "project", "rani", "hajj", "registration",
                      "healthcare", "insurance", "pension")
