"use client";

import { useState } from "react";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    const text = message.trim();
    if (!text || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "general",
          message: text,
          email: email.trim() || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setMessage("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close feedback" : "Send feedback"}
        style={{
          position: "fixed",
          bottom: 20,
          right: 88,
          zIndex: 50,
          height: 40,
          padding: "0 14px",
          borderRadius: 20,
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          transition: "transform 150ms cubic-bezier(0.23,1,0.32,1)",
        }}
        className="active:scale-95"
      >
        {open ? "Close" : "Feedback"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 68,
            right: 20,
            zIndex: 50,
            width: 300,
            maxWidth: "calc(100vw - 40px)",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
            Share feedback
          </div>
          {status === "sent" ? (
            <p style={{ color: "#16a34a", fontSize: 13 }}>Thanks — got it.</p>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's working, what's not…"
                rows={3}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  color: "#0f172a",
                }}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                  outline: "none",
                  color: "#0f172a",
                }}
              />
              <button
                onClick={submit}
                disabled={status === "sending"}
                className="active:scale-95"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 150ms cubic-bezier(0.23,1,0.32,1)",
                }}
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
              {status === "error" && (
                <p style={{ color: "#dc2626", fontSize: 12 }}>Couldn&apos;t send — try again.</p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
