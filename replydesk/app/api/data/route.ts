// Centralised data API — proxy for all free public APIs.
// All portfolio projects expose this at /api/data
// GET /api/data?source=trivia&amount=10
// GET /api/data?source=weather&lat=51.5&lon=-0.1
// GET /api/data?source=currency&base=GBP&to=USD,EUR
// GET /api/data?source=crypto&ids=bitcoin,ethereum
// GET /api/data?source=flights&bbox=49,-12,61,2
// GET /api/data?source=news&q=AI&lang=en
// GET /api/data?source=nutrition&query=apple
// GET /api/data?source=jobs&query=developer
// GET /api/data?source=geocode&q=Paris
// GET /api/data?source=holidays&country=GB&year=2026
// GET /api/data?source=books&q=machine+learning
// GET /api/data?source=facts

import { NextRequest, NextResponse } from 'next/server'
import { queryData, DataSource } from '@/lib/data-api'

const VALID_SOURCES: DataSource[] = [
  'trivia', 'weather', 'currency', 'crypto', 'flights',
  'news', 'nutrition', 'jobs', 'geocode', 'holidays', 'books', 'facts',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') as DataSource | null

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({
      error: 'source required',
      valid_sources: VALID_SOURCES,
      examples: {
        trivia: '/api/data?source=trivia&amount=10&difficulty=easy',
        weather: '/api/data?source=weather&lat=51.5&lon=-0.1',
        currency: '/api/data?source=currency&base=GBP&to=USD,EUR,INR',
        crypto: '/api/data?source=crypto&ids=bitcoin,ethereum',
        flights: '/api/data?source=flights&bbox=49,-12,61,2',
        news: '/api/data?source=news&q=AI+startup',
        nutrition: '/api/data?source=nutrition&query=apple',
        jobs: '/api/data?source=jobs&query=react+developer',
        geocode: '/api/data?source=geocode&q=Tokyo',
        holidays: '/api/data?source=holidays&country=GB&year=2026',
        books: '/api/data?source=books&q=machine+learning',
        facts: '/api/data?source=facts',
      },
    }, { status: 400 })
  }

  const result = await queryData({
    source,
    amount: searchParams.get('amount') ? Number(searchParams.get('amount')) : undefined,
    triviaCategory: searchParams.get('category') ? Number(searchParams.get('category')) : undefined,
    jobCategory: searchParams.get('job_category') ?? undefined,
    difficulty: searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | undefined,
    lat: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
    lon: searchParams.get('lon') ? Number(searchParams.get('lon')) : undefined,
    base: searchParams.get('base') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    ids: searchParams.get('ids') ?? undefined,
    vs_currency: searchParams.get('vs_currency') ?? undefined,
    per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : undefined,
    bbox: searchParams.get('bbox') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    query: searchParams.get('query') ?? undefined,
    lang: searchParams.get('lang') ?? undefined,
    max: searchParams.get('max') ? Number(searchParams.get('max')) : undefined,
    country: searchParams.get('country') ?? undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    type: searchParams.get('type') ?? undefined,
  })

  if (result.error) {
    return NextResponse.json(result, { status: 502 })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' },
  })
}
