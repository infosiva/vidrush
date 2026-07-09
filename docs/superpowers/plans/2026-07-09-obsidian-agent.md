# Personal Obsidian RAG Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI agent that answers questions over Siva's Obsidian vault using real retrieval (Chroma + Ollama embeddings) and can call 3 tools (search_notes, create_note, send_summary) via the Claude API tool-use loop.

**Architecture:** Standalone Python project (`obsidian-agent/`) with 4 layers: ingestion (chunk + embed vault notes into Chroma), retrieval (query Chroma for top-k chunks), agent loop (Claude API tool-use over injected retrieval context), CLI interface (rich-formatted REPL). Eval harness runs fixed test queries through the full stack and reports tool-selection/retrieval accuracy.

**Tech Stack:** Python 3.12, `chromadb` (local persistent), `ollama` Python client (embeddings via `nomic-embed-text`), `anthropic` SDK (tool use), `rich` (CLI formatting), `pytest`.

**Spec:** `docs/superpowers/specs/2026-07-09-obsidian-agent-design.md`

## Global Constraints

- Vault path: `/Users/sivaprakasam/Obsidian/ClaudeVault` (configurable via `OBSIDIAN_VAULT_PATH` env var)
- Ollama host: default `http://localhost:11434` (configurable via `OLLAMA_HOST`)
- Embedding model: `nomic-embed-text`
- Claude model: `claude-sonnet-5`
- Chunk threshold: notes < 500 tokens = 1 chunk; >= 500 tokens = split on `##` headings
- Max tool-call iterations per turn: 5
- `create_note` writes only to `<vault>/_agent-created/`, never vault root or existing files
- Every tool returns `{status: "ok"|"no_results"|"error", ...}` — no bare exceptions cross the tool-call boundary
- No conversation memory across CLI process restarts (in-session only)
- Fail loud (not silent) on missing `ANTHROPIC_API_KEY` or unreachable Ollama — no hardcoded fallback secrets, per repo secret-prevention rules

---

## File Structure

```
obsidian-agent/
├── config.py              # env vars + defaults, single source of truth
├── chunking.py             # note -> chunks (pure function, no I/O deps beyond file read)
├── ingest.py               # walks vault, calls chunking.py, embeds via Ollama, upserts to Chroma
├── retrieval.py             # embeds query, queries Chroma, returns chunks
├── tools/
│   ├── __init__.py
│   ├── search_notes.py
│   ├── create_note.py
│   └── send_summary.py
├── agent.py                  # Claude tool-use loop, wires tools + retrieval context
├── cli.py                     # REPL entry point, rich formatting
├── eval/
│   ├── eval_cases.json
│   └── run_eval.py
├── tests/
│   ├── test_chunking.py
│   ├── test_retrieval.py
│   ├── test_tools.py
│   └── test_agent.py
├── requirements.txt
├── .env.example
└── README.md
```

Rationale: `chunking.py` split from `ingest.py` because chunking logic is pure and independently testable (no filesystem/network dependency needed to test the splitting rule), while `ingest.py` is the I/O-heavy orchestration (walk directory, call Ollama, call Chroma). `tools/` is one file per tool — each tool is independently testable and the agent loop only needs to know each tool's function signature, not its internals.

---

### Task 1: Config + chunking logic

**Files:**
- Create: `obsidian-agent/config.py`
- Create: `obsidian-agent/chunking.py`
- Test: `obsidian-agent/tests/test_chunking.py`
- Create: `obsidian-agent/requirements.txt`
- Create: `obsidian-agent/.env.example`

**Interfaces:**
- Produces: `config.VAULT_PATH: Path`, `config.OLLAMA_HOST: str`, `config.EMBED_MODEL: str`, `config.CLAUDE_MODEL: str`, `config.CHUNK_TOKEN_THRESHOLD: int = 500`, `config.MAX_TOOL_ITERATIONS: int = 5`, `config.AGENT_CREATED_SUBDIR: str = "_agent-created"`
- Produces: `chunking.chunk_note(file_path: Path, raw_text: str) -> list[dict]` where each dict is `{chunk_id: str, file_path: str, title: str, heading: str | None, tags: list[str], modified_date: str, text: str}`

- [ ] **Step 1: Write requirements.txt and .env.example**

`obsidian-agent/requirements.txt`:
```
anthropic>=0.40.0
chromadb>=0.5.0
ollama>=0.4.0
rich>=13.0.0
python-frontmatter>=1.1.0
pytest>=8.0.0
```

`obsidian-agent/.env.example`:
```
ANTHROPIC_API_KEY=sk-ant-...
OBSIDIAN_VAULT_PATH=/Users/sivaprakasam/Obsidian/ClaudeVault
OLLAMA_HOST=http://localhost:11434
```

- [ ] **Step 2: Write config.py**

```python
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
if not ANTHROPIC_API_KEY:
    print("[config] WARNING: ANTHROPIC_API_KEY not set — agent.py will fail at first API call")
```

- [ ] **Step 3: Write failing test for chunking**

```python
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd obsidian-agent && python3 -m pytest tests/test_chunking.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'chunking'`

- [ ] **Step 5: Implement chunking.py**

```python
# obsidian-agent/chunking.py
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path

import frontmatter

from config import CHUNK_TOKEN_THRESHOLD

HEADING_RE = re.compile(r"^##\s+(.+)$", re.MULTILINE)


def _estimate_tokens(text: str) -> int:
    # ponytail: word-count/0.75 approximation, good enough for a chunk-size threshold
    return int(len(text.split()) / 0.75)


def _make_chunk_id(file_path: Path, heading: str | None) -> str:
    key = f"{file_path}::{heading or ''}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _split_by_heading(body: str) -> list[tuple[str | None, str]]:
    matches = list(HEADING_RE.finditer(body))
    if not matches:
        return [(None, body)]
    sections = []
    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        sections.append((heading, body[start:end].strip()))
    return sections


def chunk_note(file_path: Path, raw_text: str) -> list[dict]:
    post = frontmatter.loads(raw_text)
    tags = post.metadata.get("tags", [])
    if isinstance(tags, str):
        tags = [tags]
    body = post.content.strip()
    title = file_path.stem
    try:
        modified_date = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat()
    except FileNotFoundError:
        modified_date = datetime.now(timezone.utc).isoformat()

    if _estimate_tokens(body) < CHUNK_TOKEN_THRESHOLD:
        sections = [(None, body)]
    else:
        sections = _split_by_heading(body)

    chunks = []
    for heading, text in sections:
        if not text:
            continue
        chunks.append({
            "chunk_id": _make_chunk_id(file_path, heading),
            "file_path": str(file_path),
            "title": title,
            "heading": heading,
            "tags": tags,
            "modified_date": modified_date,
            "text": text,
        })
    return chunks
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd obsidian-agent && python3 -m pytest tests/test_chunking.py -v`
Expected: `4 passed`

- [ ] **Step 7: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/config.py obsidian-agent/chunking.py obsidian-agent/tests/test_chunking.py obsidian-agent/requirements.txt obsidian-agent/.env.example
git commit -m "feat(obsidian-agent): config + chunking logic with tests"
```

---

### Task 2: Ingestion (vault -> Chroma)

**Files:**
- Create: `obsidian-agent/ingest.py`
- Test: `obsidian-agent/tests/test_ingest.py`

**Interfaces:**
- Consumes: `chunking.chunk_note(file_path, raw_text) -> list[dict]` (Task 1), `config.VAULT_PATH`, `config.CHROMA_DB_PATH`, `config.CHROMA_COLLECTION`, `config.EMBED_MODEL`, `config.OLLAMA_HOST`
- Produces: `ingest.embed_text(text: str) -> list[float]`, `ingest.get_chroma_collection() -> chromadb.Collection`, `ingest.run_ingest(vault_path: Path | None = None) -> int` (returns count of chunks upserted), `ingest.walk_vault(vault_path: Path) -> list[Path]`

- [ ] **Step 1: Write failing test for walk_vault (pure, no network)**

```python
# obsidian-agent/tests/test_ingest.py
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest import walk_vault

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd obsidian-agent && python3 -m pytest tests/test_ingest.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'ingest'`

- [ ] **Step 3: Implement ingest.py**

```python
# obsidian-agent/ingest.py
from pathlib import Path

import chromadb
import ollama

import config
from chunking import chunk_note


def walk_vault(vault_path: Path) -> list[Path]:
    return sorted(
        p for p in vault_path.rglob("*.md")
        if not any(part.startswith(".") for part in p.relative_to(vault_path).parts)
    )


def embed_text(text: str) -> list[float]:
    client = ollama.Client(host=config.OLLAMA_HOST)
    try:
        response = client.embeddings(model=config.EMBED_MODEL, prompt=text)
    except Exception as e:
        raise RuntimeError(
            f"Ollama embedding call failed at {config.OLLAMA_HOST} (model={config.EMBED_MODEL}). "
            f"Is Ollama running? Try: ollama serve && ollama pull {config.EMBED_MODEL}"
        ) from e
    return response["embedding"]


def get_chroma_collection():
    client = chromadb.PersistentClient(path=str(config.CHROMA_DB_PATH))
    return client.get_or_create_collection(name=config.CHROMA_COLLECTION)


def run_ingest(vault_path: Path | None = None) -> int:
    vault_path = vault_path or config.VAULT_PATH
    if not vault_path.exists():
        raise FileNotFoundError(f"Vault path does not exist: {vault_path}")

    collection = get_chroma_collection()
    files = walk_vault(vault_path)

    total_chunks = 0
    for file_path in files:
        raw_text = file_path.read_text(encoding="utf-8")
        chunks = chunk_note(file_path, raw_text)
        if not chunks:
            continue

        ids = [c["chunk_id"] for c in chunks]
        embeddings = [embed_text(c["text"]) for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "file_path": c["file_path"],
                "title": c["title"],
                "heading": c["heading"] or "",
                "tags": ",".join(c["tags"]),
                "modified_date": c["modified_date"],
            }
            for c in chunks
        ]
        collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
        total_chunks += len(chunks)

    return total_chunks


if __name__ == "__main__":
    count = run_ingest()
    print(f"Ingested {count} chunks from {config.VAULT_PATH}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd obsidian-agent && python3 -m pytest tests/test_ingest.py -v`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/ingest.py obsidian-agent/tests/test_ingest.py
git commit -m "feat(obsidian-agent): ingestion pipeline (vault -> chunks -> Chroma)"
```

---

### Task 3: Retrieval

**Files:**
- Create: `obsidian-agent/retrieval.py`
- Test: `obsidian-agent/tests/test_retrieval.py`

**Interfaces:**
- Consumes: `ingest.embed_text(text) -> list[float]`, `ingest.get_chroma_collection() -> Collection` (Task 2)
- Produces: `retrieval.search(query: str, top_k: int = 5, tag_filter: str | None = None) -> list[dict]` where each result dict is `{file_path, title, heading, text, score, tags}`

- [ ] **Step 1: Write failing test using a fake collection (no real Ollama/Chroma needed)**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd obsidian-agent && python3 -m pytest tests/test_retrieval.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'retrieval'`

- [ ] **Step 3: Implement retrieval.py**

```python
# obsidian-agent/retrieval.py
from ingest import embed_text, get_chroma_collection
from config import DEFAULT_TOP_K


def search(query: str, top_k: int = DEFAULT_TOP_K, tag_filter: str | None = None) -> list[dict]:
    query_embedding = embed_text(query)
    collection = get_chroma_collection()

    where = {"tags": {"$eq": tag_filter}} if tag_filter else None
    raw = collection.query(query_embeddings=[query_embedding], n_results=top_k, where=where)

    ids = raw["ids"][0]
    if not ids:
        return []

    documents = raw["documents"][0]
    distances = raw["distances"][0]
    metadatas = raw["metadatas"][0]

    results = []
    for doc, dist, meta in zip(documents, distances, metadatas):
        results.append({
            "file_path": meta["file_path"],
            "title": meta["title"],
            "heading": meta["heading"] or None,
            "text": doc,
            "score": dist,
            "tags": meta["tags"].split(",") if meta["tags"] else [],
        })
    return results
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd obsidian-agent && python3 -m pytest tests/test_retrieval.py -v`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/retrieval.py obsidian-agent/tests/test_retrieval.py
git commit -m "feat(obsidian-agent): retrieval layer over Chroma"
```

---

### Task 4: Tools (search_notes, create_note, send_summary)

**Files:**
- Create: `obsidian-agent/tools/__init__.py`
- Create: `obsidian-agent/tools/search_notes.py`
- Create: `obsidian-agent/tools/create_note.py`
- Create: `obsidian-agent/tools/send_summary.py`
- Test: `obsidian-agent/tests/test_tools.py`

**Interfaces:**
- Consumes: `retrieval.search(query, top_k, tag_filter) -> list[dict]` (Task 3), `config.VAULT_PATH`, `config.AGENT_CREATED_SUBDIR`
- Produces:
  - `search_notes.run(query: str, top_k: int = 5, tag_filter: str | None = None) -> dict` → `{"status": "ok"|"no_results"|"error", "results": [...] | None, "message": str | None}`
  - `create_note.run(title: str, content: str, tags: list[str] = []) -> dict` → `{"status": "ok"|"error", "file_path": str | None, "message": str | None}`
  - `send_summary.run(period: str = "week", tag_filter: str | None = None, claude_client=None) -> dict` → `{"status": "ok"|"no_results"|"error", "summary": str | None, "file_path": str | None, "message": str | None}`
  - `tools/__init__.py` exposes `TOOL_REGISTRY: dict[str, callable]` mapping tool name -> `run` function, and `TOOL_SCHEMAS: list[dict]` — Anthropic tool-use JSON schemas for all 3 tools

- [ ] **Step 1: Write failing tests for all 3 tools**

```python
# obsidian-agent/tests/test_tools.py
from pathlib import Path
from unittest.mock import patch
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd obsidian-agent && python3 -m pytest tests/test_tools.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'tools'`

- [ ] **Step 3: Implement tools/search_notes.py**

```python
# obsidian-agent/tools/search_notes.py
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
```

- [ ] **Step 4: Implement tools/create_note.py**

```python
# obsidian-agent/tools/create_note.py
import re
from datetime import date

import config


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "untitled"


def run(title: str, content: str, tags: list[str] | None = None) -> dict:
    tags = tags or []
    try:
        target_dir = config.VAULT_PATH / config.AGENT_CREATED_SUBDIR
        target_dir.mkdir(parents=True, exist_ok=True)

        base_name = f"{date.today().isoformat()}-{_slugify(title)}"
        file_path = target_dir / f"{base_name}.md"
        suffix = 2
        while file_path.exists():
            file_path = target_dir / f"{base_name}-{suffix}.md"
            suffix += 1

        tag_line = f"tags: [{', '.join(tags)}]\n" if tags else ""
        body = f"---\ntitle: {title}\n{tag_line}---\n\n{content}\n"
        file_path.write_text(body, encoding="utf-8")

        return {"status": "ok", "file_path": str(file_path), "message": None}
    except Exception as e:
        return {"status": "error", "file_path": None, "message": str(e)}


SCHEMA = {
    "name": "create_note",
    "description": "Create a new note in the vault's _agent-created subfolder. Never overwrites existing notes.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Note title"},
            "content": {"type": "string", "description": "Note body content (markdown)"},
            "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional tags"},
        },
        "required": ["title", "content"],
    },
}
```

- [ ] **Step 5: Implement tools/send_summary.py**

```python
# obsidian-agent/tools/send_summary.py
from datetime import datetime, timedelta, timezone
from pathlib import Path

import config
from ingest import walk_vault
from retrieval import search

PERIOD_DAYS = {"day": 1, "week": 7, "month": 30}


def _notes_in_period(period: str) -> list[Path]:
    days = PERIOD_DAYS.get(period, 7)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    files = walk_vault(config.VAULT_PATH)
    recent = []
    for f in files:
        mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
        if mtime >= cutoff:
            recent.append(f)
    return recent


def run(period: str = "week", tag_filter: str | None = None, claude_client=None) -> dict:
    try:
        notes = _notes_in_period(period)
    except Exception as e:
        return {"status": "error", "summary": None, "file_path": None, "message": str(e)}

    if not notes:
        return {
            "status": "no_results",
            "summary": None,
            "file_path": None,
            "message": f"No notes modified in the last {period}",
        }

    combined_text = "\n\n---\n\n".join(
        f"# {f.stem}\n{f.read_text(encoding='utf-8')}" for f in notes
    )

    if claude_client is None:
        import anthropic
        claude_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    try:
        response = claude_client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": f"Summarize these notes from the past {period} into a short digest with key themes:\n\n{combined_text}",
            }],
        )
        summary_text = response.content[0].text
    except Exception as e:
        return {"status": "error", "summary": None, "file_path": None, "message": str(e)}

    target_dir = config.VAULT_PATH / config.AGENT_CREATED_SUBDIR
    target_dir.mkdir(parents=True, exist_ok=True)
    out_path = target_dir / f"summary-{datetime.now(timezone.utc).date().isoformat()}.md"
    out_path.write_text(f"---\ntitle: Summary ({period})\n---\n\n{summary_text}\n", encoding="utf-8")

    return {"status": "ok", "summary": summary_text, "file_path": str(out_path), "message": None}


SCHEMA = {
    "name": "send_summary",
    "description": "Summarize notes modified in a recent period (day/week/month) into a digest, saved to the vault.",
    "input_schema": {
        "type": "object",
        "properties": {
            "period": {"type": "string", "enum": ["day", "week", "month"], "default": "week"},
            "tag_filter": {"type": "string", "description": "Optional tag to filter notes by"},
        },
        "required": [],
    },
}
```

- [ ] **Step 6: Implement tools/__init__.py registry**

```python
# obsidian-agent/tools/__init__.py
from . import search_notes, create_note, send_summary

TOOL_REGISTRY = {
    "search_notes": search_notes.run,
    "create_note": create_note.run,
    "send_summary": send_summary.run,
}

TOOL_SCHEMAS = [
    search_notes.SCHEMA,
    create_note.SCHEMA,
    send_summary.SCHEMA,
]
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd obsidian-agent && python3 -m pytest tests/test_tools.py -v`
Expected: `6 passed`

- [ ] **Step 8: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/tools/ obsidian-agent/tests/test_tools.py
git commit -m "feat(obsidian-agent): search_notes, create_note, send_summary tools"
```

---

### Task 5: Agent loop (Claude tool-use)

**Files:**
- Create: `obsidian-agent/agent.py`
- Test: `obsidian-agent/tests/test_agent.py`

**Interfaces:**
- Consumes: `tools.TOOL_REGISTRY: dict[str, callable]`, `tools.TOOL_SCHEMAS: list[dict]` (Task 4), `retrieval.search(query, top_k, tag_filter) -> list[dict]` (Task 3), `config.CLAUDE_MODEL`, `config.MAX_TOOL_ITERATIONS`, `config.ANTHROPIC_API_KEY`
- Produces: `agent.run_turn(user_message: str, history: list[dict] | None = None, claude_client=None) -> dict` → `{"response": str, "tool_calls": list[dict], "history": list[dict]}` where each `tool_calls` entry is `{"tool": str, "input": dict, "result": dict}`

- [ ] **Step 1: Write failing tests using a fake Anthropic client**

```python
# obsidian-agent/tests/test_agent.py
from pathlib import Path
from unittest.mock import MagicMock, patch
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd obsidian-agent && python3 -m pytest tests/test_agent.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agent'`

- [ ] **Step 3: Implement agent.py**

```python
# obsidian-agent/agent.py
import anthropic

import config
from retrieval import search
from tools import TOOL_REGISTRY, TOOL_SCHEMAS

MAX_TOOL_ITERATIONS = config.MAX_TOOL_ITERATIONS

SYSTEM_PROMPT = """You are a personal knowledge assistant for the user's Obsidian vault.
Ground your answers in the retrieved notes context provided below and in tool results.
If retrieval or a tool returns no results, say so honestly — never fabricate note content.
Cite the source file/heading when answering from notes.
"""


def _build_context_block(query: str) -> str:
    try:
        chunks = search(query, top_k=5)
    except Exception as e:
        return f"[retrieval unavailable: {e}]"

    if not chunks:
        return "[no relevant notes found for this query]"

    parts = []
    for c in chunks:
        loc = f"{c['title']}" + (f" > {c['heading']}" if c.get("heading") else "")
        parts.append(f"### {loc}\n{c['text']}")
    return "\n\n".join(parts)


def _execute_tool(name: str, tool_input: dict) -> dict:
    fn = TOOL_REGISTRY.get(name)
    if fn is None:
        return {"status": "error", "message": f"Unknown tool: {name}"}
    try:
        return fn(**tool_input)
    except Exception as e:
        return {"status": "error", "message": str(e)}


def run_turn(user_message: str, history: list[dict] | None = None, claude_client=None) -> dict:
    if claude_client is None:
        claude_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    context_block = _build_context_block(user_message)
    messages = list(history or [])
    messages.append({
        "role": "user",
        "content": f"Relevant notes:\n{context_block}\n\nUser question: {user_message}",
    })

    tool_calls = []
    capped = False

    for _ in range(MAX_TOOL_ITERATIONS):
        response = claude_client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_SCHEMAS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            text = "".join(b.text for b in response.content if b.type == "text")
            messages.append({"role": "assistant", "content": response.content})
            return {"response": text, "tool_calls": tool_calls, "history": messages}

        messages.append({"role": "assistant", "content": response.content})
        tool_result_blocks = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            result = _execute_tool(block.name, block.input)
            tool_calls.append({"tool": block.name, "input": block.input, "result": result})
            tool_result_blocks.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": str(result),
            })
        messages.append({"role": "user", "content": tool_result_blocks})
    else:
        capped = True

    if capped:
        return {
            "response": "Reached max tool-call iterations — capped to avoid a runaway loop. Partial results above.",
            "tool_calls": tool_calls,
            "history": messages,
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd obsidian-agent && python3 -m pytest tests/test_agent.py -v`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/agent.py obsidian-agent/tests/test_agent.py
git commit -m "feat(obsidian-agent): Claude tool-use agent loop with iteration cap"
```

---

### Task 6: CLI

**Files:**
- Create: `obsidian-agent/cli.py`

**Interfaces:**
- Consumes: `agent.run_turn(user_message, history, claude_client) -> dict` (Task 5), `config.ANTHROPIC_API_KEY`, `config.OLLAMA_HOST`
- Produces: runnable script, no importable interface consumed by later tasks (eval harness calls `agent.run_turn` directly, not the CLI)

- [ ] **Step 1: Implement cli.py**

```python
# obsidian-agent/cli.py
import sys

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

import config
from agent import run_turn

console = Console()


def _preflight_check():
    if not config.ANTHROPIC_API_KEY:
        console.print("[red]ANTHROPIC_API_KEY not set.[/red] Copy .env.example to .env and fill it in.")
        sys.exit(1)

    import ollama
    try:
        ollama.Client(host=config.OLLAMA_HOST).list()
    except Exception:
        console.print(
            f"[red]Ollama not reachable at {config.OLLAMA_HOST}.[/red] "
            f"Start it with: ollama serve   (and: ollama pull {config.EMBED_MODEL})"
        )
        sys.exit(1)


def main():
    _preflight_check()
    console.print(Panel.fit("Obsidian Agent — ask a question, or Ctrl-C to quit", style="bold cyan"))

    history = []
    while True:
        try:
            query = console.input("[bold green]you>[/bold green] ")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]bye[/dim]")
            break

        if not query.strip():
            continue

        with console.status("[dim]thinking...[/dim]"):
            result = run_turn(query, history=history)

        for call in result["tool_calls"]:
            console.print(f"[dim]  -> called {call['tool']}({call['input']}) => {call['result']['status']}[/dim]")

        console.print(Panel(Markdown(result["response"]), title="agent", border_style="cyan"))
        history = result["history"]


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Manual smoke test**

Run: `cd obsidian-agent && cp .env.example .env` then fill in `ANTHROPIC_API_KEY`, run `ollama pull nomic-embed-text`, run `python3 ingest.py`, then `python3 cli.py` and ask a real question about a note known to exist in the vault.
Expected: agent responds grounded in real vault content, tool-call trace printed in dim text before the answer.

- [ ] **Step 3: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/cli.py
git commit -m "feat(obsidian-agent): CLI REPL with rich formatting"
```

---

### Task 7: Eval harness

**Files:**
- Create: `obsidian-agent/eval/eval_cases.json`
- Create: `obsidian-agent/eval/run_eval.py`

**Interfaces:**
- Consumes: `agent.run_turn(user_message, history, claude_client) -> dict` (Task 5)
- Produces: runnable script printing pass/fail/judgment-needed per case, no interface consumed elsewhere

- [ ] **Step 1: Write eval_cases.json (13 cases)**

```json
[
  {"query": "What have I written about Vercel account setup?", "expected_tool": "search_notes", "expected_behavior": "Answers grounded in retrieved notes, cites a source file", "category": "retrieval"},
  {"query": "Summarize what I did this week", "expected_tool": "send_summary", "expected_behavior": "Calls send_summary with period=week, returns a digest", "category": "summary"},
  {"query": "Create a note titled 'Test Idea' with content 'Try X next week'", "expected_tool": "create_note", "expected_behavior": "Calls create_note, confirms file written to _agent-created", "category": "write"},
  {"query": "What did I write about my pet dragon's birthday party on Mars?", "expected_tool": "search_notes", "expected_behavior": "no_results returned, agent says it found nothing rather than inventing an answer", "category": "no_results"},
  {"query": "What's 17 * 4?", "expected_tool": null, "expected_behavior": "Answers directly without calling any tool", "category": "no_tool_needed"},
  {"query": "Summarize my notes from the last month about design system decisions", "expected_tool": "send_summary", "expected_behavior": "Calls send_summary with period=month", "category": "summary"},
  {"query": "Search my notes for anything tagged 'security'", "expected_tool": "search_notes", "expected_behavior": "Calls search_notes with tag_filter=security", "category": "retrieval"},
  {"query": "Make a note called 'Groceries' listing milk, eggs, bread", "expected_tool": "create_note", "expected_behavior": "Creates note, does not overwrite any existing file", "category": "write"},
  {"query": "What's the capital of France?", "expected_tool": null, "expected_behavior": "Answers directly, general knowledge not vault-dependent", "category": "no_tool_needed"},
  {"query": "What did I decide about the Vercel account split between infosiva and sivaprakasam?", "expected_tool": "search_notes", "expected_behavior": "Retrieves grounded answer citing the actual decision from notes", "category": "retrieval"},
  {"query": "How's the weather today?", "expected_tool": null, "expected_behavior": "Agent explains it has no weather tool/data rather than guessing", "category": "out_of_scope"},
  {"query": "Summarize today's notes", "expected_tool": "send_summary", "expected_behavior": "Calls send_summary with period=day; if nothing modified today, honest no_results response", "category": "summary"},
  {"query": "Find notes about a topic that doesn't exist, like 'underwater basket weaving techniques'", "expected_tool": "search_notes", "expected_behavior": "no_results, agent does not fabricate content", "category": "no_results"}
]
```

- [ ] **Step 2: Implement run_eval.py**

```python
# obsidian-agent/eval/run_eval.py
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from agent import run_turn

CASES_PATH = Path(__file__).parent / "eval_cases.json"


def run_all():
    cases = json.loads(CASES_PATH.read_text())
    results = []

    for i, case in enumerate(cases, 1):
        print(f"\n[{i}/{len(cases)}] {case['query']}")
        result = run_turn(case["query"])
        tools_called = [c["tool"] for c in result["tool_calls"]]
        expected_tool = case["expected_tool"]

        if expected_tool is None:
            verdict = "PASS" if not tools_called else "JUDGMENT_NEEDED"
        else:
            verdict = "PASS" if expected_tool in tools_called else "FAIL"

        print(f"  expected_tool={expected_tool} actual_tools={tools_called} -> {verdict}")
        print(f"  expected_behavior: {case['expected_behavior']}")
        print(f"  actual_response: {result['response'][:200]}")

        results.append({
            "query": case["query"],
            "category": case["category"],
            "expected_tool": expected_tool,
            "actual_tools": tools_called,
            "verdict": verdict,
            "response_preview": result["response"][:200],
        })

    passed = sum(1 for r in results if r["verdict"] == "PASS")
    failed = sum(1 for r in results if r["verdict"] == "FAIL")
    judgment = sum(1 for r in results if r["verdict"] == "JUDGMENT_NEEDED")
    print(f"\n--- {passed} passed, {failed} failed, {judgment} need judgment (of {len(results)}) ---")

    return results


if __name__ == "__main__":
    run_all()
```

- [ ] **Step 3: Manual run against real vault (after Task 6 setup already done)**

Run: `cd obsidian-agent && python3 eval/run_eval.py`
Expected: 13 cases printed with verdicts; review any FAIL or JUDGMENT_NEEDED cases manually — this is a visibility tool, not a CI gate, so no specific pass count is required to proceed, but every FAIL should be understood (bad chunking? bad tool description? bad retrieval?) before calling the project done.

- [ ] **Step 4: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/eval/
git commit -m "feat(obsidian-agent): eval harness with 13 test queries"
```

---

### Task 8: README

**Files:**
- Create: `obsidian-agent/README.md`

**Interfaces:**
- Consumes: nothing (documentation only)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Write README.md**

```markdown
# Obsidian Agent

Personal CLI agent that answers questions over an Obsidian vault using real
retrieval (RAG) — not base-model recall — and can take real actions via
tools (create notes, generate summaries).

## Setup

\`\`\`bash
cd obsidian-agent
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY
ollama pull nomic-embed-text
python3 ingest.py       # builds the local Chroma index from your vault
python3 cli.py           # start the REPL
\`\`\`

## Architecture

- `chunking.py` — pure function: note text -> chunks. Notes under 500 tokens
  become one chunk; longer notes split on `##` headings.
- `ingest.py` — walks the vault, chunks each note, embeds via Ollama
  (`nomic-embed-text`), upserts into a local persistent ChromaDB collection.
- `retrieval.py` — embeds a query, fetches top-k similar chunks from Chroma.
- `tools/` — `search_notes`, `create_note`, `send_summary`. Each returns
  `{status: "ok"|"no_results"|"error", ...}` — never a bare exception.
- `agent.py` — Claude API tool-use loop. Injects retrieved chunks as context,
  lets Claude call tools, caps at 5 tool-call iterations per turn.
- `cli.py` — REPL interface, `rich`-formatted.
- `eval/` — 13 test queries with expected tool/behavior, run via
  `python3 eval/run_eval.py`. Not a CI gate — a visibility tool to see
  *why* retrieval or tool selection is failing, not just that it is.

## Re-indexing

The Chroma index does **not** auto-update when you edit the vault. Re-run
`python3 ingest.py` after making significant note changes. There is no
file-watcher in v1.

## Configurable vs. hardcoded

**Configurable** (via `.env` or `config.py`):
- Vault path (`OBSIDIAN_VAULT_PATH`)
- Ollama host (`OLLAMA_HOST`)
- Embedding model, Claude model
- Top-k default, max tool iterations, agent-created-notes subfolder name

**Hardcoded v1 assumptions:**
- Chunk size threshold: 500 tokens
- Heading split only on `##` (not `###` or deeper)
- Single vault only — no multi-vault support
- `create_note` only ever writes to `<vault>/_agent-created/` — no
  note-editing tool exists, to avoid accidental overwrite of real notes

## Known failure modes

1. **Stale index** — editing the vault outside `ingest.py` does not
   auto-update retrieval. Symptom: agent answers from outdated note content
   or misses new notes entirely. Fix: re-run `ingest.py`.
2. **Heading-split context loss** — splitting a long note by `##` heading
   means a section chunk loses context established in an earlier section of
   the same note. Symptom: an answer citing one section may miss nuance
   from a sibling section.
3. **Embedding quality ceiling** — `nomic-embed-text` (local, free) is
   weaker than paid embedding APIs (Voyage/OpenAI) on nuanced or ambiguous
   queries. Symptom: relevant notes ranked below irrelevant ones on fuzzy
   phrasing.
4. **Empty-period summaries** — `send_summary` on a period with zero
   modified notes returns an honest "nothing to summarize," not a
   fabricated digest. This is intentional, not a bug.
5. **No cross-session memory** — each `cli.py` run starts with empty
   history. Closing and reopening the REPL loses conversation context
   (not vault content — that's still indexed).

## Design spec

Full design rationale: `../docs/superpowers/specs/2026-07-09-obsidian-agent-design.md`
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sivaprakasam/projects/agents
git add obsidian-agent/README.md
git commit -m "docs(obsidian-agent): README with config/hardcoded/failure-mode docs"
```

---

## Self-Review Notes

**Spec coverage check:**
- Ingestion + chunking strategy → Task 1 (chunking.py) + Task 2 (ingest.py) ✓
- Local vector store retrieval → Task 3 ✓
- Agent loop with Claude tool use, real error handling → Task 5 ✓
- 3 concrete tools wired up → Task 4 ✓
- CLI interface → Task 6 ✓
- Eval script, 10-15 queries → Task 7 (13 cases) ✓
- README: hardcoded vs configurable, known failure modes → Task 8 ✓
- "Not building agencyos" — confirmed during brainstorming (unrelated booking-marketplace domain), documented at top of spec doc ✓

**Type consistency check:** `search()` signature `(query, top_k, tag_filter)` used identically in Task 3, Task 4 (`search_notes.py`), and Task 5 (`agent.py`). Tool `run()` functions all return `dict` with `status` key, consumed uniformly in `agent.py`'s `_execute_tool`. `TOOL_REGISTRY`/`TOOL_SCHEMAS` names match between Task 4 producer and Task 5 consumer.

**No placeholders:** all code blocks are complete, runnable implementations — no TODOs.
