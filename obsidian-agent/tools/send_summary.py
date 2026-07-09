from datetime import datetime, timedelta, timezone
from pathlib import Path

import frontmatter

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


def _note_tags(f: Path) -> list[str]:
    # ponytail: reuse chunking.py's frontmatter.loads pattern instead of a
    # second YAML/regex parser — same lightweight approach, one dependency.
    post = frontmatter.loads(f.read_text(encoding="utf-8"))
    tags = post.metadata.get("tags", [])
    return [tags] if isinstance(tags, str) else tags


def run(period: str = "week", tag_filter: str | None = None, claude_client=None) -> dict:
    try:
        notes = _notes_in_period(period)
        if tag_filter:
            notes = [f for f in notes if tag_filter in _note_tags(f)]
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
