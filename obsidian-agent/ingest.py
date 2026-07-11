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
