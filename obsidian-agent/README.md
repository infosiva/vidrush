# Obsidian Agent

Personal CLI agent that answers questions over an Obsidian vault using real
retrieval (RAG) — not base-model recall — and can take real actions via
tools (create notes, generate summaries).

## Setup

```bash
cd obsidian-agent
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY
ollama pull nomic-embed-text
python3 ingest.py       # builds the local Chroma index from your vault
python3 cli.py           # start the REPL
```

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
