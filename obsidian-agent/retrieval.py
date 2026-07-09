# obsidian-agent/retrieval.py
from ingest import embed_text, get_chroma_collection
from config import DEFAULT_TOP_K


def search(query: str, top_k: int = DEFAULT_TOP_K, tag_filter: str | None = None) -> list[dict]:
    query_embedding = embed_text(query)
    collection = get_chroma_collection()

    # ponytail: tags are stored comma-joined ("work,personal"), so Chroma's $eq
    # can't match a single tag inside a multi-tag note. Over-fetch without a
    # where filter and do the membership check in Python instead.
    fetch_n = top_k * 5 if tag_filter else top_k
    raw = collection.query(query_embeddings=[query_embedding], n_results=fetch_n)

    ids = raw["ids"][0]
    if not ids:
        return []

    documents = raw["documents"][0]
    distances = raw["distances"][0]
    metadatas = raw["metadatas"][0]

    results = []
    for doc, dist, meta in zip(documents, distances, metadatas):
        tags = meta["tags"].split(",") if meta["tags"] else []
        if tag_filter and tag_filter not in tags:
            continue
        results.append({
            "file_path": meta["file_path"],
            "title": meta["title"],
            "heading": meta["heading"] or None,
            "text": doc,
            "score": dist,
            "tags": tags,
        })
        if len(results) == top_k:
            break
    return results
