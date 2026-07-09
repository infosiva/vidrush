# obsidian-agent/tests/test_chunking.py
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from chunking import chunk_note

def test_short_note_single_chunk():
    text = "---\ntags: [test]\n---\n\nJust a short note under threshold."
    chunks = chunk_note(Path("/vault/short.md"), text)
    assert len(chunks) == 1
    assert chunks[0]["heading"] is None
    assert chunks[0]["tags"] == ["test"]
    assert "short note" in chunks[0]["text"]

def test_long_note_splits_on_headings():
    body = "word " * 600
    text = f"---\ntags: []\n---\n\n## First Section\n{body}\n\n## Second Section\n{body}"
    chunks = chunk_note(Path("/vault/long.md"), text)
    assert len(chunks) == 2
    assert chunks[0]["heading"] == "First Section"
    assert chunks[1]["heading"] == "Second Section"

def test_chunk_id_stable_across_reruns():
    text = "---\ntags: []\n---\n\nSame content."
    chunks_a = chunk_note(Path("/vault/stable.md"), text)
    chunks_b = chunk_note(Path("/vault/stable.md"), text)
    assert chunks_a[0]["chunk_id"] == chunks_b[0]["chunk_id"]

def test_frontmatter_not_in_chunk_text():
    text = "---\ntags: [a, b]\n---\n\nBody text only."
    chunks = chunk_note(Path("/vault/fm.md"), text)
    assert "tags:" not in chunks[0]["text"]
    assert chunks[0]["tags"] == ["a", "b"]

def test_blank_tags_frontmatter_chunks_with_empty_list():
    text = "---\ntags:\n---\n\nBody with blank tags key."
    chunks = chunk_note(Path("/vault/blank-tags.md"), text)
    assert len(chunks) == 1
    assert chunks[0]["tags"] == []
