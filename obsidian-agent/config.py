# obsidian-agent/config.py
import os
from pathlib import Path

VAULT_PATH = Path(os.environ.get("OBSIDIAN_VAULT_PATH", "/Users/sivaprakasam/Obsidian/ClaudeVault"))
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5")
CHROMA_DB_PATH = Path(os.environ.get("CHROMA_DB_PATH", str(Path(__file__).parent / ".chroma")))
CHROMA_COLLECTION = "obsidian_notes"

CHUNK_TOKEN_THRESHOLD = 500
MAX_TOOL_ITERATIONS = 5
AGENT_CREATED_SUBDIR = "_agent-created"
DEFAULT_TOP_K = 5

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
# Fail-loud enforcement lives in agent.py (run_turn), where the key is actually
# consumed to construct the anthropic.Anthropic client — not here at import time,
# since other modules import this file for unrelated constants.
