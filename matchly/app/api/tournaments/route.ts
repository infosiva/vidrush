import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { generateId, generateToken, slugify } from '@/lib/utils'
import { API_LIMITER } from '@/lib/rateLimit'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { name, sport = 'cricket', teams: teamNames = [], organiserEmail } = body

    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (teamNames.length < 2) return NextResponse.json({ error: 'at least 2 teams required' }, { status: 400 })

    const baseSlug = slugify(name)
    // Ensure unique slug
    let slug = baseSlug
    const existing = await db.select({ slug: schema.tournaments.slug })
      .from(schema.tournaments)
      .where(eq(schema.tournaments.slug, baseSlug))
    if (existing.length) slug = `${baseSlug}-${generateId().slice(0, 4)}`

    const id = generateId()
    const editToken = generateToken()

    await db.insert(schema.tournaments).values({
      id, slug, name: name.trim(), sport, editToken,
      organiserEmail: organiserEmail?.trim() || null,
    })

    const insertedTeams = await Promise.all(
      teamNames.map((t: string) => {
        const teamId = generateId()
        const words = t.trim().split(/\s+/)
        const short = words.length >= 2
          ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
          : t.slice(0, 3).toUpperCase()
        return db.insert(schema.teams).values({
          id: teamId, tournamentId: id, name: t.trim(), shortName: short,
        }).returning()
      })
    )

    return NextResponse.json({
      slug,
      editToken,
      shareUrl: `/t/${slug}`,
      scoreUrl: `/t/${slug}/score?token=${editToken}`,
      teams: insertedTeams.flat().map(t => ({ id: t.id, name: t.name, shortName: t.shortName })),
    })
  } catch (err) {
    console.error('[POST /api/tournaments]', err)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  try {
    const rows = await db.select({
      id: schema.tournaments.id,
      slug: schema.tournaments.slug,
      name: schema.tournaments.name,
      sport: schema.tournaments.sport,
      status: schema.tournaments.status,
      createdAt: schema.tournaments.createdAt,
    }).from(schema.tournaments).orderBy(schema.tournaments.createdAt)

    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/tournaments]', err)
    return NextResponse.json({ error: 'Failed to list tournaments' }, { status: 500 })
  }
}
