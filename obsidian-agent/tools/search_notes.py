from retrieval import search


def run(query: str, top_k: int = 5, tag_filter: str | None = None) -> dict:
    try:
        results = search(query, top_k=top_k, tag_filter=tag_filter)
    except Exception as e:
        return {"status": "error", "results": None, "message": str(e)}

    if not results:
        return {"status": "no_results", "results": None, "message": f"No notes found matching '{query}'"}

    return {"status": "ok", "results": results, "message": None}


SCHEMA = {
    "name": "search_notes",
    "description": "Search the Obsidian vault for notes relevant to a query. Returns matched chunks with file/heading citations.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
            "top_k": {"type": "integer", "description": "Number of results to return", "default": 5},
            "tag_filter": {"type": "string", "description": "Optional tag to filter results by"},
        },
        "required": ["query"],
    },
}
