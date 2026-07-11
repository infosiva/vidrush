import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { ok } = checkRateLimit(`feedback:${ip}`, 20);
  if (!ok) {
    return NextResponse.json({ error: "Rate limit hit, try again in a bit" }, { status: 429 });
  }

  const { type, rating, message, email, page } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  console.log("[feedback]", { type, rating, message, email, page, site: "renewalpilot" });

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `RenewalPilot feedback${type ? ` (${type})` : ""}${rating ? ` [${rating}/5]` : ""}\n${message}${email ? `\nfrom: ${email}` : ""}${page ? `\npage: ${page}` : ""}`,
        }),
      });
    } catch {
      // Telegram delivery failure shouldn't fail the request — feedback is already logged above
    }
  }

  return NextResponse.json({ ok: true });
}
