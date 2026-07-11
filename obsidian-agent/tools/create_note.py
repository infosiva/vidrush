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
