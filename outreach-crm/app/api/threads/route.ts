export const dynamic = 'force-dynamic'
// List all threads with status — for inbox/follow-up views
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')  // replied | opened | sent | bounced

  const rows = await db.query.threads.findMany({
    where: (t, { eq, and }) => and(
      eq(t.userId, session.user!.id!),
      status ? eq(t.status, status as any) : undefined,
    ),
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    limit: 100,
    with: {
      lead:     { columns: { id: true, name: true, email: true, product: true, city: true, status: true } },
      messages: { orderBy: (m: any, { desc }: any) => [desc(m.sentAt)], limit: 1 },
    },
  })

  return NextResponse.json({ threads: rows })
}
