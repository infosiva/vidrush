import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromSession } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
