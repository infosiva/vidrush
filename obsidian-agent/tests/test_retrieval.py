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
