import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromSession } from "@/lib/auth";

const FREE_LIMIT = 3;

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const contracts = await prisma.contract.findMany({
    where: { userId },
    orderBy: { renewalDate: "asc" },
  });
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!user.unlocked) {
    const count = await prisma.contract.count({ where: { userId } });
    if (count >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Free limit reached (3 contracts). Upgrade to add more.", limitReached: true },
        { status: 402 }
      );
    }
  }

  const { vendor, renewalDate, noticePeriodDays, cost, rawText } = await req.json();
  if (!vendor || !renewalDate) {
    return NextResponse.json({ error: "vendor and renewalDate are required" }, { status: 400 });
  }

  const contract = await prisma.contract.create({
    data: {
      vendor,
      renewalDate: new Date(renewalDate),
      noticePeriodDays: noticePeriodDays ?? 30,
      cost: cost ?? null,
      rawText: rawText ?? null,
      userId,
    },
  });

  return NextResponse.json({ contract });
}
