// Dashboard stats — total leads, sent, opened, replied, bounced
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { leads, threads } from '@/db/schema'
import { eq, count, sql } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user!.id!

  const [leadStats] = await db
    .select({
      total:        count(),
      new_count:    sql<number>`count(*) filter (where status = 'new')`,
      contacted:    sql<number>`count(*) filter (where status = 'contacted')`,
      replied:      sql<number>`count(*) filter (where status = 'replied')`,
      interested:   sql<number>`count(*) filter (where status = 'interested')`,
      converted:    sql<number>`count(*) filter (where status = 'converted')`,
      bounced:      sql<number>`count(*) filter (where status = 'bounced')`,
      unsubscribed: sql<number>`count(*) filter (where status = 'unsubscribed')`,
    })
    .from(leads)
    .where(eq(leads.userId, userId))

  const [threadStats] = await db
    .select({
      total_sent:    count(),
      opened:        sql<number>`count(*) filter (where status = 'opened' or opened_at is not null)`,
      replied:       sql<number>`count(*) filter (where status = 'replied' or replied_at is not null)`,
      bounced:       sql<number>`count(*) filter (where status = 'bounced')`,
    })
    .from(threads)
    .where(eq(threads.userId, userId))

  return NextResponse.json({
    leads: leadStats,
    emails: threadStats,
    rates: {
      openRate:  threadStats.total_sent > 0 ? Math.round((threadStats.opened / threadStats.total_sent) * 100) : 0,
      replyRate: threadStats.total_sent > 0 ? Math.round((threadStats.replied / threadStats.total_sent) * 100) : 0,
    },
  })
}
