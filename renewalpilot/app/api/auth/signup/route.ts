import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and password (8+ chars) required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, password: await hashPassword(password) },
  });

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
}
