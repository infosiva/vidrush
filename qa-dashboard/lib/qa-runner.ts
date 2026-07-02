import { chromium } from 'playwright'

export type CheckResult = {
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type ViewportResult = {
  viewport: string
  width: number
  checks: CheckResult[]
  screenshot?: string // base64 PNG
}

export type QAResult = {
  projectId: string
  url: string
  timestamp: string
  durationMs: number
  viewports: ViewportResult[]
  summary: { pass: number; warn: number; fail: number }
  overallStatus: 'pass' | 'warn' | 'fail' | 'error'
  error?: string
}

async function runViewportChecks(page: any, width: number, height: number): Promise<{ checks: CheckResult[]; screenshot: string }> {
  const checks: CheckResult[] = []

  // C1 — H1 visible
  try {
    const h1 = page.locator('h1').first()
    await h1.waitFor({ timeout: 6000 })
    const box = await h1.boundingBox()
    const text = (await h1.textContent())?.trim().slice(0, 60)
    if (!box || box.width === 0) checks.push({ name: 'H1 visible', status: 'fail', detail: 'H1 exists but zero size' })
    else checks.push({ name: 'H1 visible', status: 'pass', detail: `"${text}"` })
  } catch {
    checks.push({ name: 'H1 visible', status: 'fail', detail: 'No H1 found within 6s' })
  }

  // C2 — No horizontal overflow
  const overflows: string[] = await page.evaluate(() => {
    const SVG = new Set(['SVG','PATH','ELLIPSE','POLYLINE','POLYGON','CIRCLE','LINE','RECT','G'])
    const w = document.documentElement.clientWidth
    const out: string[] = []
    document.querySelectorAll('*').forEach((el: any) => {
      if (SVG.has(el.tagName)) return
      if (window.getComputedStyle(el).position === 'fixed') return
      const r = el.getBoundingClientRect()
      if (r.right > w + 4) out.push(el.tagName + (el.className?.toString().split(' ')[0] ? '.' + el.className.toString().split(' ')[0] : ''))
    })
    return out.slice(0, 4)
  })
  if (overflows.length) checks.push({ name: 'No overflow', status: 'fail', detail: overflows.join(', ') })
  else checks.push({ name: 'No overflow', status: 'pass', detail: 'clean' })

  // C3 — Text overlap
  const overlaps: string[] = await page.evaluate(() => {
    const SKIP = new Set(['SCRIPT','STYLE','SVG','PATH','G'])
    const els: any[] = []
    const refs: Element[] = []
    document.querySelectorAll('h1,h2,h3,p,span,a,button,label').forEach((el: any) => {
      if (SKIP.has(el.tagName)) return
      const s = window.getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none' || s.position === 'fixed') return
      const r = el.getBoundingClientRect()
      if (r.width < 5 || r.height < 5 || r.top > 900 || r.bottom < 0) return
      const hasDirect = Array.from(el.childNodes).some((n: any) => n.nodeType === 3 && n.textContent.trim().length > 3)
      if (!hasDirect) return
      els.push({ text: el.textContent.trim().slice(0,30), top: r.top, left: r.left, bottom: r.bottom, right: r.right })
      refs.push(el)
    })
    const issues: string[] = []
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        if (refs[i].contains(refs[j]) || refs[j].contains(refs[i])) continue
        const a = els[i], b = els[j]
        if (a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4) {
          issues.push(`"${a.text}" + "${b.text}" @y=${Math.round(a.top)}`)
          if (issues.length >= 3) return issues
        }
      }
    }
    return issues
  })
  if (overlaps.length) overlaps.forEach(o => checks.push({ name: 'No text overlap', status: 'fail', detail: o }))
  else checks.push({ name: 'No text overlap', status: 'pass', detail: 'clean' })

  // C4 — Contrast
  const contrastIssues: any[] = await page.evaluate(() => {
    const issues: any[] = []
    const lum = ({ r, g, b }: any) => {
      const [rv, gv, bv] = [r, g, b].map((c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
      return 0.2126 * rv + 0.7152 * gv + 0.0722 * bv
    }
    const parse = (s: string) => { const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? { r: +m[1], g: +m[2], b: +m[3] } : null }
    document.querySelectorAll('h1,h2,h3,p,span,a,button').forEach((el: any) => {
      const s = window.getComputedStyle(el)
      const tc = parse(s.color), bc = parse(s.backgroundColor)
      if (!tc || !bc) return
      if (bc.r === 0 && bc.g === 0 && bc.b === 0 && s.backgroundColor.includes('0)')) return
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.top > 800 || r.bottom < 0) return
      const tl = lum(tc), bl = lum(bc)
      const ratio = (Math.max(tl, bl) + 0.05) / (Math.min(tl, bl) + 0.05)
      const text = el.textContent?.trim().slice(0, 35)
      if (ratio < 2.5 && text && text.length > 2)
        issues.push({ text, ratio: ratio.toFixed(2), color: s.color, bg: s.backgroundColor, y: Math.round(r.top) })
    })
    return issues.slice(0, 5)
  })
  contrastIssues.forEach(i => checks.push({ name: 'Contrast', status: 'fail', detail: `ratio ${i.ratio} — "${i.text}" text:${i.color} bg:${i.bg}` }))
  if (!contrastIssues.length) checks.push({ name: 'Contrast', status: 'pass', detail: 'all above 2.5:1' })

  // C5 — Navbar
  const nav = await page.locator('nav, header, [role="navigation"]').first().isVisible().catch(() => false)
  checks.push({ name: 'Navbar visible', status: nav ? 'pass' : 'warn', detail: nav ? 'found' : 'not found' })

  // C6 — Broken images
  const broken: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter((i: any) => !i.complete || i.naturalWidth === 0).map((i: any) => i.src?.slice(-40)).slice(0, 3)
  )
  if (broken.length) checks.push({ name: 'Images load', status: 'warn', detail: broken.join(', ') })
  else checks.push({ name: 'Images load', status: 'pass', detail: 'all ok' })

  // C7 — No raw JS values
  const raw: string[] = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const found: string[] = []
    let node: any
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim()
      if (['undefined', '[object Object]', 'null', 'NaN'].includes(t)) {
        const r = node.parentElement?.getBoundingClientRect()
        if (r && r.width > 0 && r.top < 800) found.push(`"${t}" in ${node.parentElement?.tagName}`)
      }
    }
    return found.slice(0, 3)
  })
  raw.forEach(r => checks.push({ name: 'No JS errors', status: 'fail', detail: r }))
  if (!raw.length) checks.push({ name: 'No JS errors', status: 'pass', detail: 'clean' })

  // C8 — CTA
  const cta = await page.locator('button, a').filter({ hasText: /start|try|learn|sign|free|begin|speak|generate|plan|create|get/i }).first().isVisible().catch(() => false)
  checks.push({ name: 'CTA visible', status: cta ? 'pass' : 'warn', detail: cta ? 'found' : 'not found above fold' })

  // Screenshot as base64
  const buf = await page.screenshot({ fullPage: false })
  const screenshot = buf.toString('base64')

  return { checks, screenshot }
}

export async function runQA(projectId: string, url: string): Promise<QAResult> {
  const start = Date.now()
  const viewports: ViewportResult[] = []

  let browser: any
  try {
    browser = await chromium.launch({ headless: true })

    for (const [w, h, label] of [[375, 812, 'mobile'], [1280, 800, 'desktop']] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      const page = await ctx.newPage()
      try {
        await page.goto(url, { timeout: 20000, waitUntil: 'networkidle' })
        const { checks, screenshot } = await runViewportChecks(page, w, h)
        viewports.push({ viewport: label, width: w, checks, screenshot })
      } catch (e: any) {
        viewports.push({ viewport: label, width: w, checks: [{ name: 'Page load', status: 'fail', detail: e.message?.slice(0, 100) }] })
      } finally {
        await ctx.close()
      }
    }
  } catch (e: any) {
    return { projectId, url, timestamp: new Date().toISOString(), durationMs: Date.now() - start, viewports: [], summary: { pass: 0, warn: 0, fail: 1 }, overallStatus: 'error', error: e.message }
  } finally {
    browser?.close()
  }

  const allChecks = viewports.flatMap(v => v.checks)
  const summary = { pass: allChecks.filter(c => c.status === 'pass').length, warn: allChecks.filter(c => c.status === 'warn').length, fail: allChecks.filter(c => c.status === 'fail').length }
  const overallStatus = summary.fail > 0 ? 'fail' : summary.warn > 0 ? 'warn' : 'pass'

  return { projectId, url, timestamp: new Date().toISOString(), durationMs: Date.now() - start, viewports, summary, overallStatus }
}
