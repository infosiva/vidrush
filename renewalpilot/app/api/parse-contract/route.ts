import { NextRequest, NextResponse } from "next/server";
import { parseContractText } from "@/lib/parseContract";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { ok } = checkRateLimit(`parse:${ip}`, 20);
  if (!ok) {
    return NextResponse.json({ error: "Rate limit hit, try again in a bit" }, { status: 429 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return NextResponse.json({ error: "Paste some contract text first" }, { status: 400 });
  }

  try {
    const parsed = await parseContractText(text);
    return NextResponse.json({ parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not parse this text";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
