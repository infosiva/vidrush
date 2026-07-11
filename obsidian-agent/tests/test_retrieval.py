# obsidian-agent/tests/test_retrieval.py
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from retrieval import search


class FakeCollection:
    def query(self, query_embeddings, n_results, where=None):
        return {
            "ids": [["chunk1", "chunk2"]],
            "documents": [["First matching text", "Second matching text"]],
            "distances": [[0.1, 0.4]],
            "metadatas": [[
                {"file_path": "/vault/a.md", "title": "a", "heading": "", "tags": "work"},
                {"file_path": "/vault/b.md", "title": "b", "heading": "Section", "tags": ""},
            ]],
        }


class FakeMultiTagCollection:
    def query(self, query_embeddings, n_results, where=None):
        return {
            "ids": [["chunk1", "chunk2"]],
            "documents": [["Work+personal note", "Unrelated note"]],
            "distances": [[0.1, 0.2]],
            "metadatas": [[
                {"file_path": "/vault/multi.md", "title": "multi", "heading": "", "tags": "work,personal"},
                {"file_path": "/vault/other.md", "title": "other", "heading": "", "tags": "personal"},
            ]],
        }


def test_search_returns_ranked_results():
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=FakeCollection()):
        results = search("test query", top_k=2)

    assert len(results) == 2
    assert results[0]["file_path"] == "/vault/a.md"
    assert results[0]["score"] < results[1]["score"]  # lower distance = better = first


def test_search_empty_query_returns_empty_list():
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=FakeCollection()) as mock_coll:
        mock_coll.return_value.query = lambda **kw: {
            "ids": [[]], "documents": [[]], "distances": [[]], "metadatas": [[]],
        }
        results = search("nothing matches")
    assert results == []


def test_search_tag_filter_matches_multi_tag_note():
    # Regression: tags are stored comma-joined ("work,personal") in Chroma
    # metadata. A note tagged with multiple tags must still match a
    # tag_filter for any one of its tags — this previously failed because
    # the Chroma $eq where-clause compared against the whole string.
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=FakeMultiTagCollection()):
        results = search("test query", tag_filter="work")

    assert len(results) == 1
    assert results[0]["file_path"] == "/vault/multi.md"
    assert results[0]["tags"] == ["work", "personal"]


class FakeWindowedTagCollection:
    """Simulates a vault where tag-matching notes rank deeper than the first
    fetch window, so `.query()` must genuinely be asked for a wider window
    (a bigger `n_results`) before it will surface enough of them. Tracks
    every `n_results` it was called with in `self.calls`, so tests can
    assert on the actual sequence of fetch-window sizes `search()` used —
    proving multiple rounds happened, not just checking final output.

    Layout: the first `non_matching` ids (ranked closest) never carry the
    tag. `total_matching` tag-matching ids rank right after them. A window
    smaller than `non_matching + top_k` matches will therefore return fewer
    than `top_k` tag hits, forcing the loop in `search()` to double
    `fetch_n` and retry.
    """

    def __init__(self, total_matching: int, non_matching: int = 30, collection_size: int = 200):
        self.total_matching = total_matching
        self.non_matching = non_matching
        self.collection_size = collection_size
        self.calls: list[int] = []

    def query(self, query_embeddings, n_results, where=None):
        self.calls.append(n_results)
        n = min(n_results, self.collection_size)
        ids, documents, distances, metadatas = [], [], [], []
        for i in range(n):
            if i < self.non_matching:
                # closest-ranked, non-matching
                ids.append(f"near{i}")
                documents.append(f"Unrelated note {i}")
                distances.append(0.1 + i * 0.001)
                metadatas.append({"file_path": f"/vault/near{i}.md", "title": f"near{i}", "heading": "", "tags": "personal"})
            else:
                match_idx = i - self.non_matching
                if match_idx >= self.total_matching:
                    break
                ids.append(f"work{match_idx}")
                documents.append(f"Work note {match_idx}")
                distances.append(0.5 + match_idx * 0.01)
                metadatas.append({"file_path": f"/vault/work{match_idx}.md", "title": f"work{match_idx}", "heading": "", "tags": "work"})
        return {
            "ids": [ids],
            "documents": [documents],
            "distances": [distances],
            "metadatas": [metadatas],
        }


def test_search_tag_filter_expands_fetch_when_first_window_is_short():
    # 30 non-matching notes rank closest, then 6 "work" notes rank right
    # after them, inside a 200-item collection. top_k=5 -> first fetch_n =
    # 25: window [0:25) is entirely non-matching (0 tag hits), so the OLD
    # fixed-fetch code (no expansion loop) would return 0 results here even
    # though matches exist. The fix must double fetch_n (25 -> 50) and
    # retry: window [0:50) covers all 30 non-matching + all 6 matching, so
    # round 2 succeeds.
    coll = FakeWindowedTagCollection(total_matching=6)
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=coll):
        results = search("test query", top_k=5, tag_filter="work")

    assert len(results) == 5
    assert all(r["tags"] == ["work"] for r in results)

    # Prove multiple rounds genuinely happened: more than one call, and
    # n_results strictly increased each round (the doubling behavior).
    assert len(coll.calls) > 1
    assert coll.calls == sorted(coll.calls)
    assert coll.calls[0] < coll.calls[1]
    assert coll.calls[0] == 25  # top_k * 5


def test_search_tag_filter_stops_short_when_collection_exhausted():
    # Only 2 "work" notes exist in the whole collection (32 items total:
    # 30 non-matching + 2 matching). Once fetch_n grows past 32, Chroma
    # returns fewer raw ids than requested (collection genuinely
    # exhausted) — the loop must stop right there instead of continuing to
    # double and re-query, and return the 2 genuinely-available matches
    # rather than top_k=5.
    coll = FakeWindowedTagCollection(total_matching=2, collection_size=32)
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=coll):
        results = search("test query", top_k=5, tag_filter="work")

    assert len(results) == 2
    assert all(r["tags"] == ["work"] for r in results)

    # The collection is exhausted (32 items) once fetch_n reaches 40
    # (25 -> 40 after one doubling... actually 25 -> 50, clamped to 32 raw
    # ids returned, which is < the requested 50 -> loop must stop there).
    # Assert it didn't keep re-querying beyond the round where exhaustion
    # was first signaled (len(ids) < fetch_n).
    assert coll.calls[0] == 25
    last_call_n_results = coll.calls[-1]
    assert last_call_n_results > coll.collection_size
    # No call after the exhausting one — exactly one call past round 1.
    assert len(coll.calls) == 2
