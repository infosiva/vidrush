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
        if not config.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY not set — get one at https://console.anthropic.com "
                "and export it before running the agent"
            )
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
