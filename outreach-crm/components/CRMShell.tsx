'use client'
import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Lead {
  id: number; name: string; email: string; company?: string
  city?: string; category?: string; product?: string; website?: string
  status: string; notes?: string; importedAt: string
  threads?: Array<{ id: number; status: string; repliedAt?: string; openedAt?: string; createdAt: string }>
}
interface Message {
  id: number; direction: string; from: string; to: string
  subject: string; body: string; sentAt: string
}
interface Thread {
  id: number; subject: string; status: string
  lead: Lead; messages: Message[]
}
interface Stats {
  leads: { total: number; new_count: number; contacted: number; replied: number; interested: number; converted: number; bounced: number }
  emails: { total_sent: number; opened: number; replied: number }
  rates: { openRate: number; replyRate: number }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  new: '#818cf8', contacted: '#f59e0b', replied: '#22c55e',
  interested: '#4ade80', converted: '#86efac',
  bounced: '#f87171', unsubscribed: '#9ca3af',
}
const PIPELINE_COLS = ['new', 'contacted', 'replied', 'interested', 'converted']

const EASE = [0.23, 1, 0.32, 1] as const
const listContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const listItem = { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } }
const slideIn = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE } } }

// ── Component ─────────────────────────────────────────────────────────────────
export default function CRMShell({ user }: { user: { name?: string | null; email?: string | null } }) {
  const [leads, setLeads]           = useState<Lead[]>([])
  const [stats, setStats]           = useState<Stats | null>(null)
  const [selectedLead, setSelected] = useState<Lead | null>(null)
  const [thread, setThread]         = useState<Thread | null>(null)
  const [view, setView]             = useState<'list' | 'pipeline' | 'inbox'>('list')
  const [compose, setCompose]       = useState(false)
  const [subject, setSubject]       = useState('')
  const [body, setBody]             = useState('')
  const [replyBody, setReplyBody]   = useState('')
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [sending, setSending]       = useState(false)
  const [checked, setChecked]       = useState<number[]>([])
  const [importing, setImporting]   = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const msgEnd   = useRef<HTMLDivElement>(null)

  useEffect(() => { loadLeads(); loadStats() }, [filter])
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread?.messages?.length])

  async function loadLeads() {
    const q = filter !== 'all' ? `?status=${filter}` : ''
    const r = await fetch(`/api/leads${q}`)
    const d = await r.json()
    setLeads(d.leads ?? [])
  }
  async function loadStats() {
    const r = await fetch('/api/stats')
    const d = await r.json()
    setStats(d)
  }

  async function loadThread(lead: Lead) {
    setSelected(lead)
    setCompose(false)
    if (!lead.threads?.[0]) { setThread(null); return }
    const r = await fetch(`/api/reply?threadId=${lead.threads[0].id}`)
    if (r.ok) setThread(await r.json())
  }

  async function aiSuggest() {
    if (!selectedLead) return
    setAiLoading(true)
    const r = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadName: selectedLead.name,
        leadCity: selectedLead.city ?? '',
        leadCategory: selectedLead.category ?? '',
        product: selectedLead.product ?? '',
      }),
    })
    const d = await r.json()
    if (d.subject) setSubject(d.subject)
    if (d.body) setBody(d.body)
    setAiLoading(false)
  }

  async function sendEmail() {
    if (!subject || !body || checked.length === 0) return
    setSending(true)
    const r = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: checked, subject, body, scheduleFollowUp: true }),
    })
    const d = await r.json()
    setSending(false)
    setCompose(false)
    setSubject(''); setBody(''); setChecked([])
    loadLeads(); loadStats()
    const ok = d.results?.filter((r: any) => r.ok).length ?? 0
    alert(`✅ Sent ${ok} emails. Follow-ups scheduled for day 3.`)
  }

  async function sendReply() {
    if (!replyBody || !thread) return
    setSending(true)
    await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, body: replyBody }),
    })
    setReplyBody('')
    setSending(false)
    if (selectedLead) loadThread(selectedLead)
  }

  async function updateLeadStatus(leadId: number, status: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadLeads(); loadStats()
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((h, i) => row[h] = vals[i] ?? '')
      return {
        name:     row.name || 'Unknown',
        email:    row.email || row.email_guess || '',
        company:  row.company || row.name,
        city:     row.city || '',
        category: row.category || '',
        product:  row.product || '',
        website:  row.website || '',
        phone:    row.phone || '',
      }
    }).filter(r => r.email?.includes('@'))

    const r = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, source: file.name }),
    })
    const d = await r.json()
    setImporting(false)
    loadLeads(); loadStats()
    alert(`Imported ${d.imported} new leads from ${file.name}`)
  }

  const filtered = leads.filter(l =>
    !search ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    (l.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Styles ─────────────────────────────────────────────────────────────────
  const btn = (accent = false): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, border: accent ? 'none' : '1px solid rgba(99,102,241,0.2)',
    background: accent ? 'var(--accent)' : 'rgba(99,102,241,0.08)',
    color: accent ? '#fff' : 'var(--accent2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s ease-out',
  })

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: '-apple-system, Inter, system-ui, sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            📬 Outreach<span style={{ color: 'var(--accent)' }}>CRM</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        </div>

        {/* Stats pills */}
        {stats && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text2)' }}>Total leads</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.leads.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text2)' }}>Open rate</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.rates.openRate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text2)' }}>Reply rate</span>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>{stats.rates.replyRate}%</span>
            </div>
          </div>
        )}

        {/* View switcher */}
        <div style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
          {(['list', 'pipeline', 'inbox'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: view === v ? 700 : 400,
                background: view === v ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: view === v ? 'var(--accent2)' : 'var(--text2)', marginBottom: 2 }}>
              {v === 'list' ? '☰ All leads' : v === 'pipeline' ? '⬛ Pipeline' : '📥 Inbox'}
              {v === 'inbox' && stats && (stats.leads.replied > 0) && (
                <span style={{ float: 'right', background: '#22c55e', color: '#000', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>{stats.leads.replied}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status filters (list view only) */}
        {view === 'list' && (
          <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
            {['all', 'new', 'contacted', 'replied', 'interested', 'converted', 'bounced', 'unsubscribed'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{ width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filter === s ? 700 : 400,
                  background: filter === s ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: filter === s ? 'var(--accent2)' : 'var(--text2)', marginBottom: 1 }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: s === 'all' ? '#555' : STATUS_COLOR[s], marginRight: 7 }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{ float: 'right', fontSize: 10, opacity: 0.55 }}>
                  {s === 'all' ? leads.length : leads.filter(l => l.status === s).length}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* Import + sign out */}
        <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={btn()}>
            {importing ? '⏳ Importing…' : '📥 Import CSV'}
          </button>
          <button onClick={() => signOut()}
            style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
            Sign out ↗
          </button>
        </div>
      </aside>

      {/* ── Lead list / Pipeline / Inbox ────────────────────────────────── */}
      {view === 'list' && (
        <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(7,8,15,0.5)', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email…"
              style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 7 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setChecked(filtered.map(l => l.id)); setCompose(true) }} style={{ ...btn(true), flex: 1, textAlign: 'center' }}>
                ✏️ Compose {checked.length > 0 ? `(${checked.length})` : ''}
              </button>
              <button onClick={() => setChecked([])} style={{ ...btn(), padding: '7px 10px' }}>✕</button>
            </div>
          </div>
          <motion.div style={{ flex: 1, overflowY: 'auto' }} variants={listContainer} initial="hidden" animate="visible">
            {filtered.length === 0 && (
              <motion.div variants={fadeUp} style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                No leads. Import a CSV to start.
              </motion.div>
            )}
            {filtered.map(lead => (
              <motion.div key={lead.id} variants={listItem} onClick={() => loadThread(lead)}
                whileHover={{ backgroundColor: 'rgba(99,102,241,0.06)' }}
                style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedLead?.id === lead.id ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={checked.includes(lead.id)}
                    onChange={e => { e.stopPropagation(); setChecked(p => e.target.checked ? [...p, lead.id] : p.filter(x => x !== lead.id)) }}
                    onClick={e => e.stopPropagation()}
                    style={{ marginTop: 3, accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: `${STATUS_COLOR[lead.status]}22`, color: STATUS_COLOR[lead.status], flexShrink: 0 }}>{lead.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.55, marginTop: 1 }}>
                      {[lead.product, lead.city].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Pipeline Kanban view */}
      {view === 'pipeline' && (
        <div style={{ flex: 1, display: 'flex', gap: 0, overflowX: 'auto', padding: 16, background: 'rgba(7,8,15,0.4)' }}>
          {PIPELINE_COLS.map(col => {
            const colLeads = leads.filter(l => l.status === col)
            return (
              <div key={col} style={{ minWidth: 220, maxWidth: 260, marginRight: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[col], display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[col], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>{colLeads.length}</span>
                </div>
                <motion.div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
                  variants={listContainer} initial="hidden" animate="visible">
                  {colLeads.map(lead => (
                    <motion.div key={lead.id} variants={listItem} onClick={() => { setView('list'); loadThread(lead) }}
                      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lead.email}</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.55, marginTop: 4 }}>
                        {[lead.product, lead.city].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {col !== 'converted' && (
                          <button onClick={e => { e.stopPropagation(); const next = PIPELINE_COLS[PIPELINE_COLS.indexOf(col)+1]; if (next) updateLeadStatus(lead.id, next) }}
                            style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: `1px solid ${STATUS_COLOR[PIPELINE_COLS[PIPELINE_COLS.indexOf(col)+1]] ?? '#666'}40`, background: 'transparent', color: STATUS_COLOR[PIPELINE_COLS[PIPELINE_COLS.indexOf(col)+1]] ?? '#666', cursor: 'pointer' }}>
                            → {PIPELINE_COLS[PIPELINE_COLS.indexOf(col)+1]}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {colLeads.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.4, textAlign: 'center', paddingTop: 16 }}>Empty</div>
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}

      {/* Inbox view — leads with replies */}
      {view === 'inbox' && (
        <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
            📥 Replies inbox
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leads.filter(l => l.threads?.[0]?.status === 'replied').map(lead => (
              <div key={lead.id} onClick={() => { setView('list'); loadThread(lead) }}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedLead?.id === lead.id ? 'rgba(34,197,94,0.06)' : 'transparent' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{lead.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lead.email}</div>
                <div style={{ fontSize: 10, color: '#22c55e', marginTop: 3 }}>↩ replied</div>
              </div>
            ))}
            {leads.filter(l => l.threads?.[0]?.status === 'replied').length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>No replies yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">

        {/* Compose panel */}
        {compose && (
          <motion.div key="compose" variants={slideIn} initial="hidden" animate="visible"
            exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'absolute', inset: 0 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>New email to {checked.length} leads</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedLead && (
                  <button onClick={aiSuggest} disabled={aiLoading} style={{ ...btn(), fontSize: 12 }}>
                    {aiLoading ? '⏳ Generating…' : '✨ AI suggest'}
                  </button>
                )}
                <button onClick={() => setCompose(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, letterSpacing: '0.06em' }}>SUBJECT</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Use {name} and {city} as placeholders"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginTop: 4 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, letterSpacing: '0.06em' }}>BODY</label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Hi {name},&#10;&#10;..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.6, marginTop: 4, minHeight: 240 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>✅ Day-3 follow-up auto-scheduled</span>
                <motion.button whileTap={{ scale: 0.97 }} onClick={sendEmail} disabled={sending || !subject || !body || checked.length === 0}
                  style={{ ...btn(true), fontSize: 13, padding: '10px 20px', opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'Sending…' : `Send to ${checked.length} →`}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Thread view */}
        {!compose && selectedLead && thread && (
          <motion.div key={`thread-${selectedLead.id}`} variants={slideIn} initial="hidden" animate="visible"
            exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'absolute', inset: 0 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedLead.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>{selectedLead.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={selectedLead.status}
                    onChange={e => { updateLeadStatus(selectedLead.id, e.target.value); setSelected({ ...selectedLead, status: e.target.value }) }}
                    style={{ padding: '4px 8px', borderRadius: 7, border: `1px solid ${STATUS_COLOR[selectedLead.status]}44`, background: `${STATUS_COLOR[selectedLead.status]}18`, color: STATUS_COLOR[selectedLead.status], fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                    {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setChecked([selectedLead.id]); setCompose(true) }} style={btn(true)}>
                    ↗ New email
                  </motion.button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                {[selectedLead.product, selectedLead.city, selectedLead.category].filter(Boolean).join(' · ')} · Re: {thread.subject}
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {thread.messages.map((msg, i) => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2, ease: EASE }}
                  style={{
                    alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '72%',
                    padding: '11px 14px', lineHeight: 1.6, fontSize: 13,
                    borderRadius: msg.direction === 'outbound' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: msg.direction === 'outbound' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${msg.direction === 'outbound' ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                  }}>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 5 }}>
                    {msg.direction === 'outbound' ? 'You' : selectedLead.name} · {new Date(msg.sentAt).toLocaleString()}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{msg.body}</div>
                </motion.div>
              ))}
              <div ref={msgEnd} />
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply() }}
                placeholder={`Reply to ${selectedLead.name}… (⌘↵ to send)`} rows={2}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none' }} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={sendReply} disabled={sending || !replyBody} style={{ ...btn(true), padding: '8px 16px', alignSelf: 'flex-end', opacity: sending ? 0.6 : 1 }}>
                {sending ? '…' : '↑ Send'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* No thread — first email prompt */}
        {!compose && selectedLead && !thread && (
          <motion.div key={`no-thread-${selectedLead.id}`} variants={fadeUp} initial="hidden" animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'absolute', inset: 0 }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3, ease: EASE }}
              style={{ fontSize: 48 }}>📭</motion.div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{selectedLead.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedLead.email}</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', opacity: 0.6 }}>No emails sent yet.</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setChecked([selectedLead.id]); setCompose(true) }} style={btn(true)}>
              Send first email →
            </motion.button>
          </motion.div>
        )}

        {/* Empty state */}
        {!compose && !selectedLead && (
          <motion.div key="empty" variants={fadeUp} initial="hidden" animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'absolute', inset: 0 }}>
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}
              style={{ fontSize: 56 }}>📬</motion.div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>OutreachCRM</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
              Import leads from your business-agent CSVs, send personalised emails with AI, track replies in one place.
            </p>
            {stats && stats.leads.total > 0 && (
              <motion.div style={{ display: 'flex', gap: 12, marginTop: 8 }}
                variants={listContainer} initial="hidden" animate="visible">
                {[
                  { val: stats.leads.total, label: 'leads', color: 'var(--text)' },
                  { val: `${stats.rates.openRate}%`, label: 'open rate', color: '#f59e0b' },
                  { val: `${stats.rates.replyRate}%`, label: 'reply rate', color: '#22c55e' },
                ].map(({ val, label, color }) => (
                  <motion.div key={label} variants={listItem}
                    whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
                    style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => fileRef.current?.click()} style={{ ...btn(true), marginTop: 8, fontSize: 13, padding: '10px 24px' }}>
              📥 Import CSV to start
            </motion.button>
            <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
          </motion.div>
        )}

        </AnimatePresence>
      </main>
    </div>
  )
}
