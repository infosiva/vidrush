export const dynamic = 'force-dynamic'
// GET /api/leads — list leads with thread stats
// PATCH /api/leads/:id — update status/notes
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { leads } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const product  = searchParams.get('product')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 50

  const rows = await db.query.leads.findMany({
    where: (l, { eq: eqFn, and: andFn }) => andFn(
      eqFn(l.userId, session.user!.id!),
      status  ? eqFn(l.status, status as any) : undefined,
      product ? eqFn(l.product, product)      : undefined,
    ),
    orderBy: (l, { desc: descFn }) => [descFn(l.importedAt)],
    limit:  pageSize,
    offset: (page - 1) * pageSize,
    with: {
      threads: {
        columns: { id: true, status: true, repliedAt: true, openedAt: true, createdAt: true },
        orderBy: (t: any, { desc: d }: any) => [d(t.createdAt)],
        limit: 1,
      },
    },
  })

  return NextResponse.json({ leads: rows, page, pageSize })
}
