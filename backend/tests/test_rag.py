"""RAG: chunking, embedding into ChromaDB, retrieval with citation metadata, re-indexing on change."""
import pytest

from app import db, rag

DOCS = {
    "https://example.gov.pk/housing": ("Apni Chhat Test Housing Loan",
                                       "Interest-free loans for constructing a house on a plot up to 5 marla. "
                                       "Applicants must be between 21 and 60 years of age."),
    "https://example.gov.pk/scholarship": ("Test Scholarship for Students",
                                           "Merit scholarships for university students enrolled in BS programmes "
                                           "covering tuition fee and books."),
    "https://example.gov.pk/health": ("Test Health Card", "Free cancer treatment and hospital care for patients "
                                                          "at empanelled hospitals."),
    "https://example.gov.pk/farmer": ("Test Kissan Card", "Interest-free agricultural credit for farmers to buy "
                                                          "seed, fertilizer and pesticides."),
    "https://example.gov.pk/ration": ("Test Ration Relief", "Monthly ration support for low-income families "
                                                            "registered in the socio-economic registry."),
}


@pytest.fixture()
def indexed(tmp_data):
    with db.session() as conn:
        for url, (title, text) in DOCS.items():
            conn.execute("INSERT INTO documents (url, title, content_type, text, content_hash, fetched_at, "
                         "last_changed_at) VALUES (?, ?, 'html', ?, ?, ?, ?)",
                         (url, title, text, f"h-{url}", db.now_iso(), db.now_iso()))
        collection = rag.get_collection(str(tmp_data / "chroma"))
        stats = rag.sync_index(conn, collection)
    return collection, stats


def test_chunking_keeps_pdf_page_numbers():
    text = "[Page 1]\n" + "A" * 50 + "\n[Page 2]\n" + "B sentence. " * 150
    chunks = rag.chunk_text(text, size=400, overlap=50)
    assert chunks[0]["page"] == 1
    assert chunks[-1]["page"] == 2
    assert all(len(c["text"]) <= 460 for c in chunks)


def test_at_least_five_documents_are_indexed(indexed):
    collection, stats = indexed
    assert stats["indexed_documents"] == 5 and collection.count() >= 5


@pytest.mark.parametrize("query,expected", [
    ("loan to build a house", "https://example.gov.pk/housing"),
    ("university student tuition support", "https://example.gov.pk/scholarship"),
    ("cancer treatment", "https://example.gov.pk/health"),
    ("kisan fertilizer credit", "https://example.gov.pk/farmer"),
])
def test_retrieval_finds_the_right_official_document(indexed, query, expected):
    collection, _ = indexed
    hits = rag.retrieve(query, k=2, collection=collection)
    assert hits[0]["url"] == expected
    assert hits[0]["title"] and hits[0]["fetched_at"]  # citation metadata is present


def test_changed_document_is_reindexed_not_duplicated(indexed, tmp_data):
    collection, _ = indexed
    before = collection.count()
    with db.session() as conn:
        conn.execute("UPDATE documents SET text = ?, content_hash = 'new' WHERE url = ?",
                     ("Loans up to 10 marla for rural applicants only.", "https://example.gov.pk/housing"))
        stats = rag.sync_index(conn, collection)
    assert stats["indexed_documents"] == 1 and stats["unchanged"] == 4
    assert collection.count() == before
    hit = rag.retrieve("rural 10 marla", k=1, collection=collection)[0]
    assert "10 marla" in hit["text"]
