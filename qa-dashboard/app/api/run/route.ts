import { NextRequest, NextResponse } from 'next/server'
import { runQA } from '@/lib/qa-runner'
import { PROJECTS } from '@/lib/projects'
import * as fs from 'fs'
import * as path from 'path'

const RESULTS_DIR = path.join(process.cwd(), 'results')

export async function POST(req: NextRequest) {
  const { projectId } = await req.json().catch(() => ({}))

  const projects = projectId
    ? PROJECTS.filter(p => p.id === projectId && p.active)
    : PROJECTS.filter(p => p.active)

  if (!projects.length) return NextResponse.json({ error: 'No matching projects' }, { status: 404 })

  fs.mkdirSync(RESULTS_DIR, { recursive: true })

  // Run sequentially to avoid overwhelming the machine
  const results = []
  for (const proj of projects) {
    const result = await runQA(proj.id, proj.url)
    const file = path.join(RESULTS_DIR, `${proj.id}.json`)
    fs.writeFileSync(file, JSON.stringify(result, null, 2))
    results.push({ id: proj.id, status: result.overallStatus, summary: result.summary })
  }

  return NextResponse.json({ ran: results.length, results })
}

export async function GET() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'))
  const results = files.map(f => {
    const r = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8'))
    return { id: r.projectId, url: r.url, status: r.overallStatus, summary: r.summary, timestamp: r.timestamp, durationMs: r.durationMs }
  })
  return NextResponse.json(results)
}
