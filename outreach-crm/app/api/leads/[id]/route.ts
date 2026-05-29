import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { leads } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status, notes } = await req.json()
  const update: any = { updatedAt: new Date() }
  if (status) update.status = status
  if (notes !== undefined) update.notes = notes

  await db.update(leads)
    .set(update)
    .where(and(eq(leads.id, parseInt(id)), eq(leads.userId, session.user!.id!)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(leads)
    .where(and(eq(leads.id, parseInt(id)), eq(leads.userId, session.user!.id!)))

  return NextResponse.json({ ok: true })
}
