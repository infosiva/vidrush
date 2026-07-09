from pathlib import Path
from unittest.mock import patch, MagicMock
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools import search_notes, create_note, send_summary


def test_search_notes_ok():
    fake_results = [{"file_path": "/v/a.md", "title": "a", "heading": None, "text": "hi", "score": 0.1, "tags": []}]
    with patch("tools.search_notes.search", return_value=fake_results):
        result = search_notes.run("query")
    assert result["status"] == "ok"
    assert result["results"] == fake_results


def test_search_notes_no_results():
    with patch("tools.search_notes.search", return_value=[]):
        result = search_notes.run("query with no match")
    assert result["status"] == "no_results"
    assert result["results"] is None


def test_search_notes_error_caught():
    with patch("tools.search_notes.search", side_effect=RuntimeError("ollama down")):
        result = search_notes.run("query")
    assert result["status"] == "error"
    assert "ollama down" in result["message"]


def test_create_note_writes_file(tmp_path):
    with patch("tools.create_note.config.VAULT_PATH", tmp_path):
        result = create_note.run("My Test Note", "Some content", tags=["test"])
    assert result["status"] == "ok"
    written = Path(result["file_path"])
    assert written.exists()
    assert written.parent.name == "_agent-created"
    assert "Some content" in written.read_text()


def test_create_note_collision_appends_suffix(tmp_path):
    with patch("tools.create_note.config.VAULT_PATH", tmp_path):
        first = create_note.run("Dup Title", "content A")
        second = create_note.run("Dup Title", "content B")
    assert first["file_path"] != second["file_path"]


def test_send_summary_no_notes_in_period(tmp_path):
    with patch("tools.send_summary.search", return_value=[]), \
         patch("tools.send_summary._notes_in_period", return_value=[]):
        result = send_summary.run(period="week")
    assert result["status"] == "no_results"


def test_send_summary_respects_tag_filter(tmp_path):
    work_note = tmp_path / "work-note.md"
    work_note.write_text("---\ntags: [work]\n---\n\nWork content XYZ.", encoding="utf-8")
    personal_note = tmp_path / "personal-note.md"
    personal_note.write_text("---\ntags: [personal]\n---\n\nPersonal content ABC.", encoding="utf-8")

    fake_claude = MagicMock()
    fake_claude.messages.create.return_value = MagicMock(
        content=[MagicMock(text="summary")]
    )

    with patch("tools.send_summary._notes_in_period", return_value=[work_note, personal_note]), \
         patch("tools.send_summary.config.VAULT_PATH", tmp_path):
        send_summary.run(period="week", tag_filter="work", claude_client=fake_claude)

    sent_prompt = fake_claude.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "Work content XYZ" in sent_prompt
    assert "Personal content ABC" not in sent_prompt


def test_send_summary_blank_tags_note_excluded_not_crashed(tmp_path):
    blank_note = tmp_path / "blank-tags-note.md"
    blank_note.write_text("---\ntags:\n---\n\nBlank tags content.", encoding="utf-8")
    work_note = tmp_path / "work-note.md"
    work_note.write_text("---\ntags: [work]\n---\n\nWork content XYZ.", encoding="utf-8")

    fake_claude = MagicMock()
    fake_claude.messages.create.return_value = MagicMock(
        content=[MagicMock(text="summary")]
    )

    with patch("tools.send_summary._notes_in_period", return_value=[blank_note, work_note]), \
         patch("tools.send_summary.config.VAULT_PATH", tmp_path):
        result = send_summary.run(period="week", tag_filter="work", claude_client=fake_claude)

    assert result["status"] == "ok"
    sent_prompt = fake_claude.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "Work content XYZ" in sent_prompt
    assert "Blank tags content" not in sent_prompt
