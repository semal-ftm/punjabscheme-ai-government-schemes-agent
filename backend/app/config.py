"""Central configuration. Every value can be overridden through backend/.env."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
# Keep the embedding model download next to the project (not in the user profile on C:).
os.environ.setdefault("HF_HOME", str(BACKEND_DIR.parent / ".cache" / "huggingface"))
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


def _path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value) if value else default


DATA_DIR = _path("DATA_DIR", BACKEND_DIR / "data")
SNAPSHOT_DIR = DATA_DIR / "snapshots"
MANUAL_DIR = DATA_DIR / "manual"
CHROMA_DIR = _path("CHROMA_DIR", DATA_DIR / "chroma")
DB_PATH = _path("DB_PATH", DATA_DIR / "punjabscheme.db")
RULES_PATH = _path("RULES_PATH", DATA_DIR / "rules.yaml")

# LLM: DeepSeek (OpenAI-compatible API) by default; Groq is kept as an alternative provider.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek").lower()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_DEFAULT_MODELS = {"deepseek": "deepseek-chat", "groq": "llama-3.3-70b-versatile"}
LLM_MODEL = os.getenv("LLM_MODEL") or _DEFAULT_MODELS.get(LLM_PROVIDER, "deepseek-chat")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))

# RAG
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
# Once the model is cached, skip Hugging Face's online update check (slow/unreliable connections).
if (Path(os.environ["HF_HOME"]) / "hub" / f"models--{EMBEDDING_MODEL.replace('/', '--')}").exists():
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "scheme_documents")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# Crawler
CRAWLER_USER_AGENT = os.getenv(
    "CRAWLER_USER_AGENT",
    "PunjabSchemeAI-StudentProject/1.0 (academic research; respects robots.txt)",
)
CRAWL_DELAY_SECONDS = float(os.getenv("CRAWL_DELAY_SECONDS", "2.0"))
CRAWL_TIMEOUT_SECONDS = float(os.getenv("CRAWL_TIMEOUT_SECONDS", "25"))
CRAWL_MAX_PAGES_PER_SOURCE = int(os.getenv("CRAWL_MAX_PAGES_PER_SOURCE", "30"))
CRAWL_MAX_PDFS_PER_SOURCE = int(os.getenv("CRAWL_MAX_PDFS_PER_SOURCE", "8"))
CRAWL_MAX_PDF_BYTES = int(os.getenv("CRAWL_MAX_PDF_BYTES", str(12 * 1024 * 1024)))

# Scheduler
UPDATE_INTERVAL_HOURS = float(os.getenv("UPDATE_INTERVAL_HOURS", "24"))
ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "true").lower() == "true"

# MCP: the agent starts the MCP server as a child process over stdio
MCP_SERVER_MODULE = "app.mcp_server.server"

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

for _d in (DATA_DIR, SNAPSHOT_DIR, MANUAL_DIR, CHROMA_DIR):
    _d.mkdir(parents=True, exist_ok=True)
