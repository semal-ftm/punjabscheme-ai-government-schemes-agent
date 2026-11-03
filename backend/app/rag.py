"""RAG: chunk official documents, embed with Sentence-Transformers, store and search in ChromaDB."""
from __future__ import annotations

import hashlib
import re
import sqlite3
from functools import lru_cache
from typing import Any

import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app import config, db

_PAGE_RE = re.compile(r"\[Page (\d+)\]")


@lru_cache(maxsize=1)
def _embedding_function() -> SentenceTransformerEmbeddingFunction:
    return SentenceTransformerEmbeddingFunction(model_name=config.EMBEDDING_MODEL)


@lru_cache(maxsize=4)
def get_collection(path: str | None = None):
    client = chromadb.PersistentClient(path=path or str(config.CHROMA_DIR),
                                       settings=Settings(anonymized_telemetry=False))
    return client.get_or_create_collection(config.CHROMA_COLLECTION, embedding_function=_embedding_function(),
                                           metadata={"hnsw:space": "cosine"})


def chunk_text(text: str, size: int = config.CHUNK_SIZE, overlap: int = config.CHUNK_OVERLAP) -> list[dict]:
    """Split on paragraph boundaries into ~size character chunks, remembering the PDF page."""
    chunks: list[dict] = []
    page: int | None = None
    current, current_page = "", None
    for para in re.split(r"\n+", text):
        para = para.strip()
        if not para:
            continue
        m = _PAGE_RE.fullmatch(para)
        if m:
            page = int(m.group(1))
            continue
        while len(para) > size:  # very long paragraph: hard split
            head, para = para[:size], para[size - overlap:]
            if current:
                chunks.append({"text": current, "page": current_page})
                current = ""
            chunks.append({"text": head, "page": page})
        if current and len(current) + len(para) + 1 > size:
            chunks.append({"text": current, "page": current_page})
            current = current[-overlap:] + "\n" + para if overlap else para
            current_page = page
        else:
            if not current:
                current_page = page
            current = f"{current}\n{para}" if current else para
    if current:
        chunks.append({"text": current, "page": current_page})
    return chunks


def _doc_key(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:16]


def sync_index(conn: sqlite3.Connection, collection=None) -> dict[str, int]:
    """(Re)index every document whose content changed since it was last embedded."""
    collection = collection or get_collection()
    sources = {r["id"]: dict(r) for r in conn.execute("SELECT * FROM sources")}
    schemes = {r["id"]: dict(r) for r in conn.execute("SELECT id, name, category, level FROM schemes")}
    stats = {"indexed_documents": 0, "chunks_added": 0, "unchanged": 0}
    for doc in db.rows(conn.execute("SELECT * FROM documents")):
        if doc["indexed_hash"] == doc["content_hash"]:
            stats["unchanged"] += 1
            continue
        key = _doc_key(doc["url"])
        collection.delete(where={"doc_key": key})
        src = sources.get(doc["source_id"] or "", {})
        scheme = schemes.get(doc["scheme_id"] or "", {})
        chunks = chunk_text(doc["text"])
        if chunks:
            collection.add(
                ids=[f"{key}-{i}" for i in range(len(chunks))],
                documents=[c["text"] for c in chunks],
                metadatas=[{
                    "doc_key": key,
                    "url": doc["url"],
                    "title": doc["title"] or "",
                    "source_id": doc["source_id"] or "manual",
                    "source_name": src.get("name", "Manually added official document"),
                    "category": scheme.get("category") or src.get("category", "unknown"),
                    "level": scheme.get("level") or src.get("level", "unknown"),
                    "scheme_id": doc["scheme_id"] or "",
                    "page": c["page"] if c["page"] is not None else -1,
                    "fetched_at": doc["fetched_at"],
                    "content_type": doc["content_type"],
                } for c in chunks],
            )
        conn.execute("UPDATE documents SET indexed_hash = ? WHERE id = ?", (doc["content_hash"], doc["id"]))
        stats["indexed_documents"] += 1
        stats["chunks_added"] += len(chunks)
    return stats


def retrieve(query: str, k: int = config.RAG_TOP_K, *, scheme_id: str | None = None,
             category: str | None = None, level: str | None = None, collection=None) -> list[dict[str, Any]]:
    collection = collection or get_collection()
    if collection.count() == 0:
        return []
    filters = [{key: val} for key, val in (("scheme_id", scheme_id), ("category", category), ("level", level)) if val]
    where = filters[0] if len(filters) == 1 else ({"$and": filters} if filters else None)
    res = collection.query(query_texts=[query], n_results=min(k, collection.count()), where=where)
    out = []
    for i, text in enumerate(res["documents"][0]):
        meta = res["metadatas"][0][i]
        out.append({
            "chunk_id": res["ids"][0][i],
            "text": text,
            "score": round(1 - res["distances"][0][i], 3),
            "url": meta["url"],
            "title": meta["title"],
            "source_name": meta["source_name"],
            "category": meta["category"],
            "level": meta["level"],
            "scheme_id": meta["scheme_id"] or None,
            "page": meta["page"] if meta["page"] != -1 else None,
            "fetched_at": meta["fetched_at"],
        })
    return out
