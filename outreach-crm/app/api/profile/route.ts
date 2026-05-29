// Vendor profile — from email, sender name, default product, signature
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await db.query.users.findFirst({ where: (u, { eq: e }) => e(u.id, session.user!.id!) })
  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  await db.update(users).set({ name }).where(eq(users.id, session.user!.id!))
  return NextResponse.json({ ok: true })
}
