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
