import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Dynamic project registration — new projects POST here to join the QA pool
// Body: { id, name, url, category }
const REGISTRY_FILE = path.join(process.cwd(), 'results', '_registry.json')

export async function POST(req: NextRequest) {
  const { id, name, url, category } = await req.json()
  if (!id || !name || !url) return NextResponse.json({ error: 'id, name, url required' }, { status: 400 })

  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true })
  const existing = fs.existsSync(REGISTRY_FILE)
    ? JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'))
    : []

  const idx = existing.findIndex((p: any) => p.id === id)
  const entry = { id, name, url, category: category ?? 'general', active: true, registeredAt: new Date().toISOString() }
  if (idx >= 0) existing[idx] = entry
  else existing.push(entry)

  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(existing, null, 2))
  return NextResponse.json({ ok: true, project: entry })
}

export async function GET() {
  if (!fs.existsSync(REGISTRY_FILE)) return NextResponse.json([])
  return NextResponse.json(JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8')))
}
