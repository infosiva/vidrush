# obsidian-agent/tests/test_agent.py
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

import config
from agent import run_turn


def _text_block(text):
    block = MagicMock()
    block.type = "text"
    block.text = text
    return block


def _tool_use_block(name, tool_input, tool_id="tool_1"):
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = tool_input
    block.id = tool_id
    return block


def test_run_turn_direct_answer_no_tool_call():
    fake_response = MagicMock()
    fake_response.content = [_text_block("Direct answer, no tools needed.")]
    fake_response.stop_reason = "end_turn"

    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_response

    with patch("agent.search", return_value=[]):
        result = run_turn("What is 2+2?", claude_client=fake_client)

    assert result["response"] == "Direct answer, no tools needed."
    assert result["tool_calls"] == []


def test_run_turn_calls_tool_then_answers():
    tool_call_response = MagicMock()
    tool_call_response.content = [_tool_use_block("search_notes", {"query": "vacation plans"})]
    tool_call_response.stop_reason = "tool_use"

    final_response = MagicMock()
    final_response.content = [_text_block("Based on your notes, you're planning a trip in June.")]
    final_response.stop_reason = "end_turn"

    fake_client = MagicMock()
    fake_client.messages.create.side_effect = [tool_call_response, final_response]

    fake_tool_result = {"status": "ok", "results": [{"text": "Trip to Japan in June"}], "message": None}

    with patch("agent.search", return_value=[]), \
         patch("agent.TOOL_REGISTRY", {"search_notes": lambda **kw: fake_tool_result}):
        result = run_turn("What are my vacation plans?", claude_client=fake_client)

    assert "June" in result["response"]
    assert len(result["tool_calls"]) == 1
    assert result["tool_calls"][0]["tool"] == "search_notes"
    assert result["tool_calls"][0]["result"] == fake_tool_result


def test_run_turn_caps_at_max_iterations():
    looping_response = MagicMock()
    looping_response.content = [_tool_use_block("search_notes", {"query": "x"})]
    looping_response.stop_reason = "tool_use"

    fake_client = MagicMock()
    fake_client.messages.create.return_value = looping_response

    with patch("agent.search", return_value=[]), \
         patch("agent.TOOL_REGISTRY", {"search_notes": lambda **kw: {"status": "ok", "results": [], "message": None}}), \
         patch("agent.MAX_TOOL_ITERATIONS", 2):
        result = run_turn("loop forever", claude_client=fake_client)

    assert len(result["tool_calls"]) == 2
    assert "capped" in result["response"].lower()


def test_run_turn_tool_exception_becomes_error_result():
    tool_call_response = MagicMock()
    tool_call_response.content = [_tool_use_block("search_notes", {"query": "x"})]
    tool_call_response.stop_reason = "tool_use"

    final_response = MagicMock()
    final_response.content = [_text_block("Search failed, let me know if you want to retry.")]
    final_response.stop_reason = "end_turn"

    fake_client = MagicMock()
    fake_client.messages.create.side_effect = [tool_call_response, final_response]

    def _raise(**kw):
        raise RuntimeError("boom")

    with patch("agent.search", return_value=[]), \
         patch("agent.TOOL_REGISTRY", {"search_notes": _raise}):
        result = run_turn("search something", claude_client=fake_client)

    assert result["tool_calls"][0]["result"]["status"] == "error"
    assert "boom" in result["tool_calls"][0]["result"]["message"]


def test_run_turn_raises_loudly_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        run_turn("anything", claude_client=None)
