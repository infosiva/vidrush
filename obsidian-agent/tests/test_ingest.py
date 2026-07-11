# obsidian-agent/tests/test_ingest.py
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import pytest
from ingest import walk_vault, embed_text

def test_walk_vault_finds_markdown_only(tmp_path):
    (tmp_path / "note1.md").write_text("# Note 1")
    (tmp_path / "note2.md").write_text("# Note 2")
    (tmp_path / "image.png").write_bytes(b"\x89PNG")
    (tmp_path / ".rag").mkdir()
    (tmp_path / ".rag" / "index.md").write_text("skip me")

    files = walk_vault(tmp_path)
    names = {f.name for f in files}
    assert names == {"note1.md", "note2.md"}

def test_walk_vault_skips_dotdirs(tmp_path):
    (tmp_path / ".obsidian").mkdir()
    (tmp_path / ".obsidian" / "config.md").write_text("skip")
    (tmp_path / "real.md").write_text("keep")

    files = walk_vault(tmp_path)
    assert len(files) == 1
    assert files[0].name == "real.md"

def test_embed_text_raises_runtime_error_when_ollama_unreachable():
    with patch("ollama.Client.embeddings", side_effect=ConnectionError("connection refused")):
        with pytest.raises(RuntimeError, match="ollama serve"):
            embed_text("some text")
