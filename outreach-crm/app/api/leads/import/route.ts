export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { leads } from '@/db/schema'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows, source } = await req.json() as {
    rows: Array<{
      name: string; email: string; company?: string; city?: string
      category?: string; product?: string; website?: string; phone?: string
    }>
    source: string
  }

  if (!rows?.length) return NextResponse.json({ error: 'No rows' }, { status: 400 })

  const inserted = await db.insert(leads).values(
    rows.map(r => ({
      userId:   session.user!.id!,
      name:     r.name || 'Unknown',
      email:    r.email,
      company:  r.company ?? null,
      city:     r.city ?? null,
      category: r.category ?? null,
      product:  r.product ?? null,
      website:  r.website ?? null,
      phone:    r.phone ?? null,
      source,
    }))
  ).onConflictDoNothing().returning({ id: leads.id })

  return NextResponse.json({ imported: inserted.length })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const product  = searchParams.get('product')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 50

  const rows = await db.query.leads.findMany({
    where: (l, { eq, and }) => and(
      eq(l.userId, session.user!.id!),
      status  ? eq(l.status, status as any) : undefined,
      product ? eq(l.product, product)      : undefined,
    ),
    orderBy: (l, { desc }) => [desc(l.importedAt)],
    limit:  pageSize,
    offset: (page - 1) * pageSize,
    with: { threads: { columns: { id: true, status: true, repliedAt: true } } },
  })

  return NextResponse.json({ leads: rows, page, pageSize })
}
