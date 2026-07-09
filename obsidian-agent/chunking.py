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
    tags = post.metadata.get("tags") or []
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
