# obsidian-agent/retrieval.py
from ingest import embed_text, get_chroma_collection
from config import DEFAULT_TOP_K


def _filter_tagged(raw: dict, top_k: int, tag_filter: str | None) -> list[dict]:
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


def search(query: str, top_k: int = DEFAULT_TOP_K, tag_filter: str | None = None) -> list[dict]:
    query_embedding = embed_text(query)
    collection = get_chroma_collection()

    if not tag_filter:
        raw = collection.query(query_embeddings=[query_embedding], n_results=top_k)
        return _filter_tagged(raw, top_k, tag_filter)

    # ponytail: tags are stored comma-joined ("work,personal"), so Chroma's $eq
    # can't match a single tag inside a multi-tag note. Over-fetch without a
    # where filter and do the membership check in Python instead. A fixed 5x
    # multiplier can still under-fill top_k if few candidates carry the tag,
    # so widen the fetch window and re-query until we have top_k matches or
    # Chroma has run out of candidates to give (raw ids < requested fetch_n).
    # ponytail: doubling with a 5-round cap is plenty for a single-user vault
    # (hundreds-low-thousands of chunks) — not correctness-critical to go further.
    fetch_n = top_k * 5
    for _ in range(5):
        raw = collection.query(query_embeddings=[query_embedding], n_results=fetch_n)
        ids = raw["ids"][0]
        results = _filter_tagged(raw, top_k, tag_filter)
        if len(results) >= top_k or len(ids) < fetch_n:
            return results
        fetch_n *= 2
    return results
