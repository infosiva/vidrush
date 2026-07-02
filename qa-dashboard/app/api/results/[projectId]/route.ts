import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const RESULTS_DIR = path.join(process.cwd(), 'results')

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const file = path.join(RESULTS_DIR, `${params.projectId}.json`)
  if (!fs.existsSync(file)) return NextResponse.json({ error: 'No results yet' }, { status: 404 })
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
  return NextResponse.json(data)
}
