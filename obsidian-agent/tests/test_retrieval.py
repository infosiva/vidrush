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
    """Simulates a vault where the first (small) fetch window contains no
    tag-matching notes, but a wider fetch surfaces enough. Responds
    differently based on n_results to mimic Chroma returning more
    candidates when asked for a bigger window."""

    def __init__(self, total_matching: int):
        # 3 non-matching notes rank closest, then `total_matching` tagged
        # notes rank further out (all within a 20-item collection).
        self.total_matching = total_matching
        self.collection_size = 20

    def query(self, query_embeddings, n_results, where=None):
        n = min(n_results, self.collection_size)
        ids, documents, distances, metadatas = [], [], [], []
        for i in range(n):
            if i < 3:
                # closest-ranked, non-matching
                ids.append(f"near{i}")
                documents.append(f"Unrelated note {i}")
                distances.append(0.1 + i * 0.01)
                metadatas.append({"file_path": f"/vault/near{i}.md", "title": f"near{i}", "heading": "", "tags": "personal"})
            else:
                match_idx = i - 3
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
    # top_k=5 -> first fetch_n = 25, capped to collection_size=20.
    # Reproduces the reviewer's exact bug scenario: with the OLD fixed 5x
    # fetch and no expansion loop, a first small window could return fewer
    # than top_k tag matches even though more exist deeper in the collection.
    # Here 6 "work" notes exist total but only within a window Chroma serves
    # once asked wide enough — the fix must actually reach top_k=5.
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=FakeWindowedTagCollection(total_matching=6)):
        results = search("test query", top_k=5, tag_filter="work")

    assert len(results) == 5
    assert all(r["tags"] == ["work"] for r in results)


def test_search_tag_filter_stops_short_when_collection_exhausted():
    # Only 2 "work" notes exist in the whole (small) collection. The loop
    # must stop once Chroma returns fewer raw ids than requested (collection
    # exhausted) instead of re-querying forever, and correctly return the
    # genuinely-available 2 results rather than top_k=5.
    with patch("retrieval.embed_text", return_value=[0.1, 0.2]), \
         patch("retrieval.get_chroma_collection", return_value=FakeWindowedTagCollection(total_matching=2)):
        results = search("test query", top_k=5, tag_filter="work")

    assert len(results) == 2
    assert all(r["tags"] == ["work"] for r in results)
