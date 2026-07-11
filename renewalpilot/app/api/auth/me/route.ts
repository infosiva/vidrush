import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, unlocked: true },
  });
  return NextResponse.json({ user });
}
