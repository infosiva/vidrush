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
