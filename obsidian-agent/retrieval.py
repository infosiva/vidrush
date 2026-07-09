# obsidian-agent/retrieval.py
from ingest import embed_text, get_chroma_collection
from config import DEFAULT_TOP_K


def search(query: str, top_k: int = DEFAULT_TOP_K, tag_filter: str | None = None) -> list[dict]:
    query_embedding = embed_text(query)
    collection = get_chroma_collection()

    where = {"tags": {"$eq": tag_filter}} if tag_filter else None
    raw = collection.query(query_embeddings=[query_embedding], n_results=top_k, where=where)

    ids = raw["ids"][0]
    if not ids:
        return []

    documents = raw["documents"][0]
    distances = raw["distances"][0]
    metadatas = raw["metadatas"][0]

    results = []
    for doc, dist, meta in zip(documents, distances, metadatas):
        results.append({
            "file_path": meta["file_path"],
            "title": meta["title"],
            "heading": meta["heading"] or None,
            "text": doc,
            "score": dist,
            "tags": meta["tags"].split(",") if meta["tags"] else [],
        })
    return results
