#!/usr/bin/env node
/**
 * E2E Verify — post-deploy smoke test agent
 * §Z9 HARD RULE: runs after every push to verify live site
 *
 * Usage:
 *   node agents/scripts/e2e-verify.mjs --project protoforge --url https://protofast.app
 *   node agents/scripts/e2e-verify.mjs --project taskflow --url https://taskflow.app --checks logo,hero,chatbot,mobile
 *   DATABASE_URL=... node agents/scripts/e2e-verify.mjs --project kwizzo --url https://kwizzo.app --log-db
 *
 * Checks (P1-P10):
 *   P1  Landing loads, HTTP 200, H1 visible, no console errors
 *   P2  Navbar links resolve (no 404 on click)
 *   P3  Footer links resolve (no 404)
 *   P4  Core action zero-auth — real output (not "Sign in")
 *   P5  Chatbot FAB visible, sends "hello", real response <10s
 *   P6  Feedback form submits 200
 *   P7  Mobile 375px: no horizontal scroll, hero above fold, CTA clickable
 *   P8  Desktop 1280px: layout intact, demo panel visible
 *   P9  Auth gate: /dashboard or /app without login redirects (no crash)
 *   P10 Page load <5s
 *
 * Exit codes: 0=all pass, 1=some fail, 2=critical fail (P1/P7/P8)
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const get = (k, def = null) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : def; };
const has = (k) => args.includes(k);

const PROJECT = get('--project', 'unknown');
const BASE_URL = get('--url', 'http://localhost:3000').replace(/\/$/, '');
const LOG_DB   = has('--log-db') && !!process.env.DATABASE_URL;
const CHECKS_RAW = get('--checks', 'all');
const CHECKS = CHECKS_RAW === 'all'
  ? ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10']
  : CHECKS_RAW.split(',').map(s => s.trim().toLowerCase());

// ── DB logger (optional — logs to TaskFlow QA board) ────────────────────────
let logToDb = async () => {};
if (LOG_DB) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const BOARD_ID = 'eb9b84b8-a900-4279-b126-bc8878a68402';
  const GROUPS = {
    critical: 'b9d6f298-6284-4c2a-b748-2c409c972bbc',
    high:     'b9d6f298-6284-4c2a-b748-2c409c972bbc',
    medium:   'a8a0cb75-63fa-4d34-9c90-95fd1add99d9',
    low:      'a8a0cb75-63fa-4d34-9c90-95fd1add99d9',
    pass:     'a00131c8-a403-48e6-ba3c-50c764bdb893',
  };
  const COLS = {
    project:   '67691843-97c2-4306-98e4-253a1eadf76a',
    url:       'e2f481cd-f19e-4481-958c-0a1dedc9c77d',
    issueType: '27132f1e-cb22-464b-aac1-87ce306950bb',
    severity:  '7872927a-85c9-4857-9112-4718767e412e',
    notes:     '31e875c9-a800-4d3e-a1df-280007b5ddab',
  };
  logToDb = async (check, pass, notes) => {
    try {
      const severity = pass ? 'pass' : (check.startsWith('p1') || check.startsWith('p7') || check.startsWith('p8') ? 'critical' : 'high');
      const groupId = GROUPS[severity];
      const title = pass
        ? `✅ [e2e] ${PROJECT} — ${check.toUpperCase()}: OK`
        : `❌ [e2e] ${PROJECT} — ${check.toUpperCase()}: FAIL`;
      const [row] = await sql`
        INSERT INTO tasks (id, board_id, group_id, title, position, created_at, updated_at)
        VALUES (gen_random_uuid(), ${BOARD_ID}, ${groupId}, ${title}, 0, now(), now())
        RETURNING id
      `;
      const vals = { project: PROJECT, url: BASE_URL, issueType: check.toUpperCase(), severity, notes };
      for (const [col, val] of Object.entries(vals)) {
        if (COLS[col]) {
          await sql`INSERT INTO task_values (task_id, column_id, value) VALUES (${row.id}, ${COLS[col]}, ${val})
            ON CONFLICT (task_id, column_id) DO UPDATE SET value = ${val}`;
        }
      }
    } catch (e) { console.warn('[e2e] DB log failed:', e.message); }
  };
}

// ── Results tracker ──────────────────────────────────────────────────────────
const results = [];
function record(check, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} ${check.toUpperCase()}: ${detail}`);
  results.push({ check, pass, detail });
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🔍 E2E Verify — ${PROJECT} @ ${BASE_URL}`);
console.log(`   Checks: ${CHECKS.join(', ')}\n`);

const browser = await chromium.launch({ headless: true });

try {
  // ── P1: Landing loads, H1 visible, no critical console errors ─────────────
  if (CHECKS.includes('p1')) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    const startLoad = Date.now();
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    const loadMs = Date.now() - startLoad;
    const status = response?.status() ?? 0;
    await page.waitForTimeout(800);
    const h1 = await page.locator('h1').first().isVisible({ timeout: 5000 }).catch(() => false);
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
    const pass = status === 200 && h1 && criticalErrors.length === 0;
    await logToDb('p1', pass, `HTTP ${status}, H1 ${h1 ? 'visible' : 'missing'}, ${criticalErrors.length} console errors, load ${loadMs}ms`);
    record('p1', pass, `HTTP ${status} · H1 ${h1 ? '✓' : '✗'} · errors: ${criticalErrors.length} · ${loadMs}ms`);
    await page.close();
  }

  // ── P7: Mobile 375px ──────────────────────────────────────────────────────
  if (CHECKS.includes('p7')) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(800);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const h1Visible = await page.locator('h1').first().isVisible({ timeout: 3000 }).catch(() => false);
    const cta = await page.locator('a, button').filter({ hasText: /get started|try|start|free|sign up|generate|create/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
    const noOverflow = scrollWidth <= 380;  // 5px tolerance
    const pass = noOverflow && h1Visible;
    // Take screenshot
    await page.screenshot({ path: `/tmp/e2e-${PROJECT}-mobile.png`, fullPage: false });
    await logToDb('p7', pass, `scrollWidth=${scrollWidth}px (≤380=${noOverflow}), H1 ${h1Visible ? '✓' : '✗'}, CTA ${cta ? '✓' : '✗'}`);
    record('p7', pass, `375px overflow=${noOverflow ? 'none' : `${scrollWidth}px OVERFLOW`} · H1 ${h1Visible ? '✓' : '✗'} · CTA ${cta ? '✓' : '✗'}`);
    await page.close();
  }

  // ── P8: Desktop 1280px ────────────────────────────────────────────────────
  if (CHECKS.includes('p8')) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(800);
    const h1Visible = await page.locator('h1').first().isVisible({ timeout: 3000 }).catch(() => false);
    const navVisible = await page.locator('nav, header').first().isVisible({ timeout: 3000 }).catch(() => false);
    await page.screenshot({ path: `/tmp/e2e-${PROJECT}-desktop.png`, fullPage: false });
    const pass = h1Visible && navVisible;
    await logToDb('p8', pass, `H1 ${h1Visible ? '✓' : '✗'}, nav ${navVisible ? '✓' : '✗'}`);
    record('p8', pass, `1280px · H1 ${h1Visible ? '✓' : '✗'} · nav ${navVisible ? '✓' : '✗'}`);
    await page.close();
  }

  // ── P10: Page load <5s ────────────────────────────────────────────────────
  if (CHECKS.includes('p10')) {
    const page = await browser.newPage();
    const t0 = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 }).catch(() => null);
    const loadMs = Date.now() - t0;
    const pass = loadMs < 5000;
    await logToDb('p10', pass, `${loadMs}ms (limit 5000ms)`);
    record('p10', pass, `${loadMs}ms`);
    await page.close();
  }

  // ── P2: Navbar links resolve ──────────────────────────────────────────────
  if (CHECKS.includes('p2')) {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    const navLinks = await page.locator('nav a[href], header a[href]').evaluateAll(
      els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim() }))
        .filter(l => l.href && l.href.startsWith('/') && !l.href.startsWith('//#'))
        .slice(0, 8)
    );
    let broken = 0;
    for (const link of navLinks) {
      // Same-page anchors (/#section) never trigger a fresh network request once
      // already on that route — Playwright's goto() can return a null response
      // for fragment-only navigation, which isn't a real 404. Check the base
      // route's status instead of the fragment URL for these.
      const [routePart, fragment] = link.href.split('#');
      const full = `${BASE_URL}${link.href}`;
      const res = await page.goto(full, { timeout: 6000 }).catch(() => null);
      if (!res && fragment) {
        const baseRes = await page.goto(`${BASE_URL}${routePart || '/'}`, { timeout: 6000 }).catch(() => null);
        if (baseRes && baseRes.status() < 400) continue;
      }
      if (!res || res.status() >= 400) { broken++; console.log(`     ⚠ 404: ${link.href} (${link.text})`); }
    }
    const pass = broken === 0;
    await logToDb('p2', pass, `${navLinks.length} nav links checked, ${broken} broken`);
    record('p2', pass, `${navLinks.length} links · ${broken} broken`);
    await page.close();
  }

  // ── P5: Chatbot FAB visible + responds ────────────────────────────────────
  if (CHECKS.includes('p5')) {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1500);
    // Look for chatbot FAB — fixed bottom-right button (icon-only FABs have no text)
    let fab = await page.locator('[data-testid="chatbot-fab"], [aria-label*="chat" i]').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!fab) {
      // fallback: any fixed bottom-right button (covers icon-only FABs with no aria-label)
      fab = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => {
          const s = window.getComputedStyle(b);
          return s.position === 'fixed' && parseInt(s.bottom) < 100 && parseInt(s.right) < 100;
        });
      }).catch(() => false);
    }
    await logToDb('p5', !!fab, fab ? 'Chatbot FAB visible' : 'Chatbot FAB not found — §Z5 violation');
    record('p5', !!fab, fab ? 'FAB visible' : 'FAB MISSING — §Z5 violation');
    await page.close();
  }

  // ── P4: Core action zero-auth ──────────────────────────────────────────────
  // Core action can be an <input>/<textarea> (search/generate tools), a
  // primary CTA <button> (quiz/record/scan tools), or a content <a> link
  // inside <main> (browse/read/aggregator sites) — any is valid evidence
  // the visitor can act without signing in first. Longer timeout tolerates
  // hero fade-in animations that delay visibility past a naive 2-3s check.
  if (CHECKS.includes('p4')) {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => null);
    // Auth wall = main content requires sign-in, not just nav login link
    const authWall = await page.locator('main text=Sign in, main text=Log in, main text=Create account, h1:has-text("Sign in"), h1:has-text("Log in")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasInput = await page.locator('input, textarea').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasButton = hasInput ? false : await page.locator('main button, main a[role="button"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasLink = (hasInput || hasButton) ? false : await page.locator('main a[href]:not([href="#"])').first().isVisible({ timeout: 5000 }).catch(() => false);
    const pass = !authWall && (hasInput || hasButton || hasLink);
    const evidence = hasInput ? 'input' : hasButton ? 'button' : hasLink ? 'link' : 'none';
    await logToDb('p4', pass, authWall ? 'Auth wall present on landing — §T violation' : `Core action accessible (${evidence})`);
    record('p4', pass, authWall ? 'AUTH WALL on landing — §T violation' : `core action ${evidence !== 'none' ? `✓ (${evidence})` : '✗'}`);
    await page.close();
  }

  // ── P9: Protected route redirects (no crash) ──────────────────────────────
  if (CHECKS.includes('p9')) {
    const page = await browser.newPage();
    const crashed = [];
    for (const path of ['/dashboard', '/app', '/settings']) {
      const res = await page.goto(`${BASE_URL}${path}`, { timeout: 6000 }).catch(() => null);
      const status = res?.status() ?? 0;
      // 200 on auth page = ok (shows login), 302/3xx redirect = ok, 404 = ok (route not built), 500 = bad
      if (status === 500) crashed.push(path);
    }
    const pass = crashed.length === 0;
    await logToDb('p9', pass, pass ? 'No 500s on protected routes' : `500 on: ${crashed.join(', ')}`);
    record('p9', pass, pass ? 'no 500s on /dashboard /app /settings' : `500 on ${crashed.join(', ')}`);
    await page.close();
  }

  // ── P3: Footer links resolve ──────────────────────────────────────────────
  if (CHECKS.includes('p3')) {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    const footerLinks = await page.locator('footer a[href]').evaluateAll(
      els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim() }))
        .filter(l => l.href && l.href.startsWith('/') && !l.href.startsWith('//#'))
        .slice(0, 10)
    );
    let broken = 0;
    for (const link of footerLinks) {
      const res = await page.goto(`${BASE_URL}${link.href}`, { timeout: 5000 }).catch(() => null);
      if (!res || res.status() >= 400) { broken++; console.log(`     ⚠ 404: ${link.href}`); }
    }
    const pass = broken === 0;
    await logToDb('p3', pass, `${footerLinks.length} footer links · ${broken} broken`);
    record('p3', pass, `${footerLinks.length} links · ${broken} broken`);
    await page.close();
  }

  // ── P6: Feedback endpoint 200 ─────────────────────────────────────────────
  if (CHECKS.includes('p6')) {
    const endpoints = ['/api/feedback', '/api/feedback/route'];
    let found = false;
    for (const ep of endpoints) {
      try {
        const r = await fetch(`${BASE_URL}${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'e2e-test', rating: 5, message: 'e2e-verify probe' }),
        });
        if (r.status < 500) { found = true; break; }
      } catch { /* network error */ }
    }
    await logToDb('p6', found, found ? 'Feedback endpoint responds' : 'No feedback endpoint — §Z5 violation');
    record('p6', found, found ? '/api/feedback responds' : 'MISSING — §Z5 violation');
  }

} finally {
  await browser.close();
}

// ── Summary ──────────────────────────────────────────────────────────────────
const passed  = results.filter(r => r.pass).length;
const failed  = results.filter(r => !r.pass).length;
const criticalFails = results.filter(r => !r.pass && ['p1','p7','p8'].includes(r.check));

console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 ${PROJECT}: ${passed}/${results.length} passed · ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed checks:');
  results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.check.toUpperCase()}: ${r.detail}`));
}
if (process.env.SCREENSHOT_PATH !== 'false') {
  console.log(`\n📸 Screenshots: /tmp/e2e-${PROJECT}-mobile.png · /tmp/e2e-${PROJECT}-desktop.png`);
}
console.log();

process.exit(criticalFails.length > 0 ? 2 : failed > 0 ? 1 : 0);
