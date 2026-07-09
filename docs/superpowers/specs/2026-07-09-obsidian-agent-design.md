# Personal Obsidian RAG Agent — Design Spec

**Date:** 2026-07-09
**Status:** Approved for implementation
**Not the same as:** `agencyos` (booking/marketplace SaaS template, unrelated domain), `neuralos` (unrelated AI-agent product). Confirmed no name/scope collision in `agents/` before starting.

## Goal

Personal CLI agent that answers questions over Siva's Obsidian vault (`/Users/sivaprakasam/Obsidian/ClaudeVault`, 72 notes) using real retrieval (RAG), not base-model recall, and can take real write actions via tools — not just describe them. Secondary goal: demoable/screenshot-worthy for portfolio use (terminal recording, README quality) — not a hardcoded demo, real vault + real answers.

## Non-goals (v1)

- No web UI (CLI only; web UI is a future add-on, not blocking)
- No graph traversal / wiki-link resolution
- No actual email/Telegram send for `send_summary` — it produces a digest to terminal/file, "send" is aspirational naming for now
- No auth/multi-user — single local user, local vault path

## Architecture

```
obsidian-agent/
├── ingest.py           # load vault, chunk, embed, upsert into Chroma
├── retrieval.py         # embed query, fetch top-k chunks from Chroma
├── agent.py              # Claude API tool-use loop
├── tools/
│   ├── search_notes.py
│   ├── create_note.py
│   └── send_summary.py
├── cli.py                 # REPL entry point
├── eval/
│   ├── eval_cases.json   # 10-15 test queries + expected behavior
│   └── run_eval.py
├── config.py              # all hardcoded-vs-configurable values in one place
├── requirements.txt
└── README.md
```

Single Python project, no monorepo integration needed — standalone script-style tool, matches "no heavy infra" requirement.

## Ingestion & chunking strategy

Obsidian notes here are short-form prose with `##` headers, not long documents (median note is well under 1000 words based on vault size / note count).

**Strategy:**
- Parse YAML frontmatter separately → becomes chunk metadata (`tags`, `date`), not embedded as prose text
- If note body < ~500 tokens: **one chunk per note** (avoids fragmenting short notes into meaningless slivers)
- If note body >= ~500 tokens: **split on `##` headings** — each section is a chunk. Headings are the natural semantic boundary the user already writes with.
- Wiki-links (`[[Note]]`) stay in chunk text as-is (useful signal for retrieval) but are not resolved/expanded into their target note's content in v1
- Chunk metadata always includes: `file_path`, `title`, `heading` (or null if whole-note chunk), `tags`, `modified_date`
- Chunk ID = stable hash of `file_path + heading` so re-running ingest updates existing chunks instead of duplicating

**Why this strategy over alternatives considered:**
- Fixed-size token windows (e.g. 400 tokens with overlap) — rejected: ignores note structure, would split mid-sentence in short personal notes where structure carries meaning
- Whole-vault single chunks per file only — rejected: some notes (topic files referenced in the user's own CLAUDE.md, e.g. `feedback_*.md` style long files) are long enough that heading-split retrieval will be meaningfully more precise

## Retrieval

- **Vector store:** ChromaDB, local persistent client (`chromadb.PersistentClient`), single collection `obsidian_notes`. No server process — embedded, matches "no heavy infra."
- **Embeddings:** Ollama local, model `nomic-embed-text` (pulled if not present). Zero API cost, matches user's existing Ollama-first fallback convention.
- **Query flow:** query text → embed via same Ollama model → Chroma `.query(top_k=5)` → return chunks with `file_path`/`heading`/`score` metadata.
- **Fallback:** if Ollama is not running, `retrieval.py` raises a clear error at startup (not mid-query) — "Ollama not reachable at $OLLAMA_HOST, start it with `ollama serve`" — fail loud per user's env-var convention (§I), never silently degrade to no-retrieval.

## Agent loop

- Claude API (`claude-sonnet-5`), tool-use enabled.
- Turn flow: user query → `retrieval.py` fetches top-k chunks → chunks injected into the system prompt as "relevant notes" context block (with file/heading citations) → Claude either answers directly (grounded in the injected context) or calls a tool.
- Tool-call loop: execute tool → append result to conversation → call Claude again → repeat until Claude returns plain text (no more tool calls) or **max 5 iterations** (matches user's tool-iteration-limit convention, §17) — on hitting the cap, return whatever partial answer exists plus a note that the loop was capped.
- Every tool result is structured: `{status: "ok"|"no_results"|"error", data | message}`. Claude is instructed via system prompt never to fabricate a tool result — if a tool errors, say so to the user rather than guessing.

## Tools (3, final)

### 1. `search_notes(query: str, top_k: int = 5, tag_filter: str | None = None)`
Wraps `retrieval.py`. Returns list of `{file_path, heading, text, score}`. Empty result → `{status: "no_results"}`, not empty list silently — so Claude doesn't hallucinate an answer from nothing.

### 2. `create_note(title: str, content: str, tags: list[str] = [])`
Writes a new `.md` file (frontmatter + content) into a dedicated subfolder: `<vault>/_agent-created/`. Never writes to vault root or existing notes — v1 has no note-editing tool, only note-creation, to avoid accidental overwrite of the user's real notes. Filename = slugified title + date, collision-checked (append `-2` etc. if exists).

### 3. `send_summary(period: "day"|"week"|"month" = "week", tag_filter: str | None = None)`
Finds notes with `modified_date` in the period (filesystem mtime, since frontmatter dates aren't guaranteed), retrieves their content, asks Claude (same API, separate short completion) to synthesize a digest. Output: printed to terminal, formatted with `rich`, and also written to `<vault>/_agent-created/summary-<date>.md`. No actual email/notification send in v1 (see non-goals).

## Error handling

- Tool exceptions caught at the tool-call boundary in `agent.py`, converted to `{status: "error", message: str(e)}` — never let a raw exception break the REPL loop.
- Ollama unreachable → fail loud at `cli.py` startup, not buried in a tool-call failure later.
- Claude API errors (rate limit, network) → caught in `agent.py`, printed clearly, REPL continues (doesn't crash the whole session for one bad turn).
- `create_note` filesystem errors (permissions, disk full) → caught, returned as tool error, surfaced to user in chat.

## Interface

CLI REPL (`python cli.py`), styled with `rich` for readable terminal output (headers, citations dimmed/colored, tool-call indicators) — good enough for a portfolio terminal recording without needing a web UI for v1.

## Evaluation

`eval/eval_cases.json` — 10-15 cases, each: `{query, expected_tool: str|null, expected_behavior: str, notes: str}`. Categories covered:
- Pure retrieval Q&A (should call `search_notes`, answer grounded in real note content)
- Note creation request (should call `create_note`)
- Summary request (should call `send_summary`)
- Query with no matching notes (should get `no_results` and say so honestly, not hallucinate)
- Ambiguous query (judgment call — documented expected behavior, not strict pass/fail)

`eval/run_eval.py` runs each case through `agent.py`, logs actual tool called + response, diffs against expected, prints pass/fail/judgment-needed per case. Not fully automated grading (open-ended answers aren't exact-match checkable) — it's a visibility tool per the user's spec ("see when retrieval or tool selection is failing and why"), not a CI gate.

## Config: hardcoded vs. configurable

Documented explicitly in README, single source of truth in `config.py`:
- **Configurable (env var or config.py):** vault path, Ollama host, embed model name, Claude model, top_k default, max tool iterations, agent-created-notes subfolder name
- **Hardcoded v1 assumption:** chunk size threshold (500 tokens), heading-split character (`##` only, not `###`), no multi-vault support (single vault path only)

## Known failure modes (documented in README, not silently hidden)

1. Chroma index goes stale if vault edited outside ingestion re-run — no file-watcher in v1, user must re-run `ingest.py` manually
2. Heading-split chunking can separate a heading from context established in a prior heading (loses cross-section context within one long note)
3. `nomic-embed-text` is a smaller/weaker embedding model than paid alternatives — retrieval quality on nuanced/ambiguous queries will be noticeably weaker than Voyage/OpenAI embeddings
4. `send_summary` on a period with zero modified notes returns an honest "nothing to summarize," not a fabricated summary
5. No conversation memory across CLI sessions in v1 — each `python cli.py` run starts fresh (in-session history only)
