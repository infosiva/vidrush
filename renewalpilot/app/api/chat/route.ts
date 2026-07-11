import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const SYSTEM_PROMPT = `You are the RenewalPilot assistant. RenewalPilot lets people paste any vendor contract, lease, or insurance policy and get the renewal date, notice period, and cost extracted automatically, then tracks it on a dashboard color-coded by urgency. Free tier: 3 contracts. Paid: $9 one-time unlocks unlimited contracts.

Answer questions about how RenewalPilot works, pricing, and how to use it. Keep answers short and direct.

If asked anything outside RenewalPilot, respond: "I'm trained for RenewalPilot. For that, try Google or ChatGPT!"`;

async function callGroq(model: string, messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 400,
      temperature: 0.5,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${model} failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { ok } = checkRateLimit(`chat:${ip}`, 60);
  if (!ok) {
    return NextResponse.json({ error: "Rate limit hit, try again in a bit" }, { status: 429 });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const trimmed = messages.slice(-6);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ reply: "Chat is resting — try again in a moment." });
  }

  try {
    const reply = await callGroq("llama-3.3-70b-versatile", trimmed);
    return NextResponse.json({ reply });
  } catch {
    try {
      const reply = await callGroq("llama-3.1-8b-instant", trimmed);
      return NextResponse.json({ reply });
    } catch {
      return NextResponse.json({ reply: "Chat is resting — try again in a moment." });
    }
  }
}
