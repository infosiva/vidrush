'use client'

import { useState, useEffect, useCallback } from 'react'
import { PROJECTS } from '@/lib/projects'

type Summary = { pass: number; warn: number; fail: number }
type ProjectResult = {
  id: string
  url: string
  status: 'pass' | 'warn' | 'fail' | 'error' | 'pending'
  summary: Summary
  timestamp: string
  durationMs: number
}

type DetailResult = {
  projectId: string
  url: string
  viewports: Array<{
    viewport: string
    width: number
    checks: Array<{ name: string; status: string; detail: string }>
    screenshot?: string
  }>
  summary: Summary
  overallStatus: string
  timestamp: string
  durationMs: number
}

const STATUS_COLOR: Record<string, string> = {
  pass: '#10b981', warn: '#f59e0b', fail: '#ef4444', error: '#64748b', pending: '#475569',
}
const STATUS_EMOJI: Record<string, string> = {
  pass: '✅', warn: '⚠️', fail: '❌', error: '💤', pending: '⏳',
}

function Badge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: STATUS_COLOR[status] + '22',
      color: STATUS_COLOR[status],
      fontSize: 12, fontWeight: 700, border: `1px solid ${STATUS_COLOR[status]}44`
    }}>
      {STATUS_EMOJI[status]} {status.toUpperCase()}
    </span>
  )
}

function CheckRow({ check }: { check: { name: string; status: string; detail: string } }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
      <span style={{ color: STATUS_COLOR[check.status], width: 16, flexShrink: 0 }}>
        {check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '✗'}
      </span>
      <span style={{ color: 'rgba(226,232,240,0.7)', minWidth: 140, flexShrink: 0 }}>{check.name}</span>
      <span style={{ color: check.status === 'fail' ? '#fca5a5' : 'rgba(226,232,240,0.4)', wordBreak: 'break-word' }}>{check.detail}</span>
    </div>
  )
}

export default function QADashboard() {
  const [results, setResults] = useState<Record<string, ProjectResult>>({})
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailResult | null>(null)
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn' | 'pass'>('all')
  const [globalRunning, setGlobalRunning] = useState(false)

  const loadResults = useCallback(async () => {
    const res = await fetch('/api/run').then(r => r.json()).catch(() => [])
    const map: Record<string, ProjectResult> = {}
    for (const r of res) map[r.id] = r
    setResults(map)
  }, [])

  useEffect(() => { loadResults() }, [loadResults])

  const runProject = async (projectId: string) => {
    setRunning(prev => new Set([...prev, projectId]))
    setResults(prev => ({ ...prev, [projectId]: { ...prev[projectId], id: projectId, status: 'pending', summary: { pass: 0, warn: 0, fail: 0 }, timestamp: new Date().toISOString(), durationMs: 0, url: '' } }))
    try {
      const res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) })
      const data = await res.json()
      if (data.results?.[0]) {
        const r = data.results[0]
        setResults(prev => ({ ...prev, [r.id]: r }))
      }
    } catch {}
    setRunning(prev => { const s = new Set(prev); s.delete(projectId); return s })
  }

  const runAll = async () => {
    setGlobalRunning(true)
    for (const p of PROJECTS.filter(p => p.active)) {
      await runProject(p.id)
    }
    setGlobalRunning(false)
  }

  const loadDetail = async (projectId: string) => {
    if (expanded === projectId) { setExpanded(null); setDetail(null); return }
    setExpanded(projectId)
    const d = await fetch(`/api/results/${projectId}`).then(r => r.json()).catch(() => null)
    setDetail(d)
  }

  const activeProjects = PROJECTS.filter(p => p.active)
  const filtered = activeProjects.filter(p => {
    if (filter === 'all') return true
    return results[p.id]?.status === filter
  })

  const totalPass = activeProjects.filter(p => results[p.id]?.status === 'pass').length
  const totalFail = activeProjects.filter(p => results[p.id]?.status === 'fail').length
  const totalWarn = activeProjects.filter(p => results[p.id]?.status === 'warn').length
  const totalRan = Object.keys(results).length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
            🔬 QA Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(226,232,240,0.5)' }}>
            Visual health — contrast, overflow, text overlap, UI checks — {activeProjects.length} projects
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={globalRunning}
          style={{
            padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            background: globalRunning ? 'rgba(99,102,241,0.3)' : '#6366f1',
            color: '#fff', border: 'none',
            cursor: globalRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {globalRunning ? '⏳ Running…' : '▶ Run All Projects'}
        </button>
      </div>

      {/* Summary stats */}
      {totalRan > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Projects', value: activeProjects.length, color: '#6366f1' },
            { label: '✅ Passing', value: totalPass, color: '#10b981' },
            { label: '⚠️ Warnings', value: totalWarn, color: '#f59e0b' },
            { label: '❌ Failing', value: totalFail, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111827', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'fail', 'warn', 'pass'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
              background: filter === f ? STATUS_COLOR[f] ?? '#6366f1' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#fff' : 'rgba(226,232,240,0.6)',
            }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(proj => {
          const result = results[proj.id]
          const isRunning = running.has(proj.id)
          const isOpen = expanded === proj.id

          return (
            <div key={proj.id} style={{ background: '#111827', borderRadius: 12, border: `1px solid ${result?.status === 'fail' ? '#ef444433' : result?.status === 'pass' ? '#10b98122' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden' }}>
              {/* Row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 16, cursor: 'pointer' }} onClick={() => loadDetail(proj.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{proj.name}</span>
                    <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.35)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 6 }}>{proj.category}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.35)', marginTop: 3 }}>{proj.url}</div>
                </div>

                {result ? (
                  <>
                    <Badge status={result.status} />
                    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                      <span style={{ color: '#10b981' }}>✓ {result.summary?.pass ?? 0}</span>
                      <span style={{ color: '#f59e0b' }}>! {result.summary?.warn ?? 0}</span>
                      <span style={{ color: '#ef4444' }}>✗ {result.summary?.fail ?? 0}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)' }}>{result.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : ''}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)' }}>not run</span>
                )}

                <button
                  onClick={e => { e.stopPropagation(); runProject(proj.id) }}
                  disabled={isRunning}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none',
                    background: isRunning ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.8)',
                    color: '#fff', cursor: isRunning ? 'not-allowed' : 'pointer', flexShrink: 0,
                  }}
                >
                  {isRunning ? '⏳' : '▶ Run'}
                </button>

                <span style={{ color: 'rgba(226,232,240,0.3)', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Detail panel */}
              {isOpen && detail && detail.projectId === proj.id && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>
                    {detail.viewports.map(vp => (
                      <div key={vp.viewport}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(226,232,240,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {vp.viewport} ({vp.width}px)
                        </h3>
                        {vp.checks.map((c, i) => <CheckRow key={i} check={c} />)}
                        {vp.screenshot && (
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)', marginBottom: 8 }}>Screenshot</div>
                            <img
                              src={`data:image/png;base64,${vp.screenshot}`}
                              alt={`${vp.viewport} screenshot`}
                              style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, fontSize: 12, color: 'rgba(226,232,240,0.2)', textAlign: 'center' }}>
        8 checks × 2 viewports per project · Add new project: POST /api/register · QA Dashboard
      </div>
    </div>
  )
}
