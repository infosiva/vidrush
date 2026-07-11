"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function FloatingChatWrapper() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "Chat is resting — try again in a moment." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Chat is resting — try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
          cursor: "pointer",
          fontSize: 22,
          transition: "transform 150ms cubic-bezier(0.23,1,0.32,1)",
        }}
        className="active:scale-95"
      >
        {open ? "×" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            zIndex: 50,
            width: 340,
            maxWidth: "calc(100vw - 40px)",
            height: 440,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>
            Renewal<span style={{ color: "var(--accent)" }}>Pilot</span> assistant
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Ask about how RenewalPilot works, pricing, or the free tier.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "var(--accent)" : "#f1f5f9",
                  color: m.role === "user" ? "#fff" : "#0f172a",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 14,
                  maxWidth: "85%",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && <div style={{ color: "#94a3b8", fontSize: 13 }}>Thinking…</div>}
          </div>
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e2e8f0" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question…"
              style={{
                flex: 1,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
                outline: "none",
                color: "#0f172a",
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              className="active:scale-95"
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 14,
                cursor: "pointer",
                transition: "transform 150ms cubic-bezier(0.23,1,0.32,1)",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
