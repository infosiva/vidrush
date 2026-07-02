#!/usr/bin/env node
/**
 * visual-qa.mjs — Mandatory pre-push visual QA gate
 *
 * Runs Playwright to:
 *   1. Screenshot 375px (mobile) + 1280px (desktop)
 *   2. Detect white/light text on light background (contrast failure)
 *   3. Check H1 visible, no horizontal overflow, no console errors
 *   4. Save screenshots to /tmp/vqa-<project>-{mobile,desktop}.png
 *
 * Usage:
 *   node agents/scripts/visual-qa.mjs                  # auto-detects project from cwd
 *   node agents/scripts/visual-qa.mjs --url http://localhost:3001
 *   node agents/scripts/visual-qa.mjs --url https://speakiq.app --project speakiq
 *   node agents/scripts/visual-qa.mjs --live speakiq   # uses live URL from project map
 *
 * Exit: 0 = pass, 1 = warnings, 2 = critical fail (blocks push)
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Live URL map — update when new projects deploy
const LIVE_URLS = {
  speakiq: 'https://speakiq.app',
  kwizzo: 'https://kwizzo.app',
  tutiq: 'https://tutiq.app',
  quizbites: 'https://quizbites.app',
  roamplan: 'https://roamplan.app',
  draftcal: 'https://draftcal.app',
  protoforge: 'https://protofast.app',
  trackwealth: 'https://trackwealth.app',
  invoicemint: 'https://invoicemint.app',
  flighttracker: 'https://flightbrain.app',
  resumevault: 'https://resumevault.app',
  aicoachlab: 'https://aicoachlab.app',
  worldtrends: 'https://worldtrends.today',
  mandirates: 'https://mandirates.app',
  bookingcall: 'https://bookingcall.app',
  pixelforge: 'https://arcadeforge.app',
  neuralos: 'https://neuralagent.app',
  hub: 'https://ai-products-hub.vercel.app',
  myvitals: 'https://myvitals.app',
  voicejournal: 'https://voicejournal.app',
  nammatamil: 'https://nammatamil.live',
  meetscribe: 'https://meetscribe.app',
  weekendai: 'https://weekendai.app',
  playsmart: 'https://playsmart.app',
  anylocal: 'https://anylocal.app',
  homecanvas: 'https://homecanvas.app',
  photorestore: 'https://photorestore.app',
  pdfideas: 'https://pdfideas.app',
  quizbytesdaily: 'https://quizbytesdaily.app',
  clawdbotai: 'https://clawdbotai.app',
  agenttrace: 'https://agentlogs.app',
  clipforge: 'https://clipforge.ai',
  ytportal: 'https://yt-portal.vercel.app',
};

const args = process.argv.slice(2);
const urlFlag = args[args.indexOf('--url') + 1] || null;
const liveFlag = args[args.indexOf('--live') + 1] || null;
const projectFlag = args[args.indexOf('--project') + 1] || null;
const noServer = args.includes('--no-server') || !!urlFlag || !!liveFlag;

// Detect project from cwd
const cwd = process.cwd();
const projectName = projectFlag || liveFlag || path.basename(cwd);
const outDir = `/tmp`;

let url = urlFlag || (liveFlag && LIVE_URLS[liveFlag]) || 'http://localhost:3000';
let devServer = null;

async function findFreePort() {
  const net = await import('net');
  return new Promise((resolve) => {
    const srv = net.default.createServer();
    srv.listen(0, () => { const port = srv.address().port; srv.close(() => resolve(port)); });
  });
}

async function startDevServer() {
  const port = await findFreePort();
  url = `http://localhost:${port}`;
  console.log(`🚀 Starting dev server on port ${port}...`);

  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const hasNext = !!pkg.dependencies?.next || !!pkg.devDependencies?.next;

  const cmd = hasNext ? 'npx' : 'npm';
  const cmdArgs = hasNext ? ['next', 'dev', '--port', String(port)] : ['run', 'dev'];
  const env = { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' };

  devServer = spawn(cmd, cmdArgs, { cwd, env, stdio: 'pipe' });

  // Wait for server ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 45000);
    const check = setInterval(async () => {
      try {
        const http = await import('http');
        http.default.get(url, (res) => {
          if (res.statusCode < 500) {
            clearInterval(check);
            clearTimeout(timeout);
            setTimeout(resolve, 1500); // extra settle time
          }
        }).on('error', () => {});
      } catch {}
    }, 1000);
  });

  console.log(`✅ Server ready at ${url}`);
}

// Check if bg color is "light" (luminance > 0.5)
function isLight(hex) {
  if (!hex) return null;
  const c = hex.replace('#', '');
  if (c.length < 6) return null;
  const r = parseInt(c.slice(0,2),16) / 255;
  const g = parseInt(c.slice(2,4),16) / 255;
  const b = parseInt(c.slice(4,6),16) / 255;
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance > 0.5;
}

function isLightRgb(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const r = parseInt(m[1])/255, g = parseInt(m[2])/255, b = parseInt(m[3])/255;
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance > 0.5;
}

async function runChecks(page, label) {
  const results = { label, pass: [], warn: [], fail: [] };

  // P1 — H1 visible
  try {
    const h1 = page.locator('h1').first();
    await h1.waitFor({ timeout: 8000 });
    const h1Text = await h1.textContent();
    const h1Box = await h1.boundingBox();
    if (!h1Box || h1Box.width === 0) {
      results.fail.push('H1 exists but not visible (zero size)');
    } else {
      results.pass.push(`H1 visible: "${h1Text?.trim().slice(0,60)}"`);
    }
  } catch {
    results.fail.push('No H1 found or visible within 8s');
  }

  // P2 — No horizontal overflow (skip SVG internals — they use logical coords, not pixel layout)
  const overflows = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const SVG_TAGS = new Set(['SVG', 'PATH', 'ELLIPSE', 'POLYLINE', 'POLYGON', 'CIRCLE', 'LINE', 'RECT', 'G', 'DEFS', 'USE', 'SYMBOL', 'CLIPPATH', 'MASK']);
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      if (SVG_TAGS.has(el.tagName.toUpperCase())) return;
      // Skip fixed/absolute positioned orb/bg elements that intentionally bleed
      const pos = window.getComputedStyle(el).position;
      if (pos === 'fixed') return;
      const rect = el.getBoundingClientRect();
      if (rect.right > docW + 4) overflowing.push(el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''));
    });
    return overflowing.slice(0, 5);
  });
  if (overflows.length) {
    results.fail.push(`Horizontal overflow detected: ${overflows.join(', ')}`);
  } else {
    results.pass.push('No horizontal overflow');
  }

  // P3 — Console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 100)); });
  if (errors.length > 0) {
    results.warn.push(`${errors.length} console error(s): ${errors[0]}`);
  } else {
    results.pass.push('No console errors');
  }

  // P4 — CONTRAST CHECK: detect light text on light bg, dark text on dark bg
  const contrastIssues = await page.evaluate(() => {
    const issues = [];
    const hero = document.querySelector('section, main, [class*="hero"], [class*="Hero"]');
    const elements = (hero || document.body).querySelectorAll('h1, h2, h3, p, button, a, span');

    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color; // text color
      const bg = style.backgroundColor;

      // Parse rgb values
      const parseRgb = (s) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
      };
      const lum = ({r,g,b}) => {
        const [rv,gv,bv] = [r,g,b].map(c => { c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); });
        return 0.2126*rv + 0.7152*gv + 0.0722*bv;
      };

      const tc = parseRgb(color);
      const bc = parseRgb(bg);
      if (!tc || !bc) return;

      // Skip fully transparent bg
      if (bc.r === 0 && bc.g === 0 && bc.b === 0 && bg.includes('0)')) return;

      const textLum = lum(tc);
      const bgLum = lum(bc);
      const ratio = (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);

      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      if (box.top > 800) return; // only above-fold

      if (ratio < 2.5) { // very low contrast
        const text = el.textContent?.trim().slice(0, 40);
        if (text && text.length > 2) {
          issues.push({
            tag: el.tagName,
            text,
            ratio: ratio.toFixed(2),
            color,
            bg,
            top: Math.round(box.top)
          });
        }
      }
    });
    return issues.slice(0, 5);
  });

  if (contrastIssues.length > 0) {
    contrastIssues.forEach(issue => {
      results.fail.push(
        `LOW CONTRAST (ratio ${issue.ratio}:1) — ${issue.tag} "${issue.text}" | text:${issue.color} bg:${issue.bg} @y=${issue.top}px`
      );
    });
  } else {
    results.pass.push('Contrast check passed (above fold)');
  }

  // P5 — CTA visible
  try {
    const cta = page.locator('button, a').filter({ hasText: /start|try|learn|sign|free|begin|speak|generate|plan|create/i }).first();
    const visible = await cta.isVisible().catch(() => false);
    if (visible) results.pass.push('Primary CTA visible');
    else results.warn.push('No obvious CTA found above fold');
  } catch {
    results.warn.push('CTA check skipped');
  }

  return results;
}

async function main() {
  const checks = { project: projectName, url, timestamp: new Date().toISOString(), viewports: [] };
  let exitCode = 0;

  try {
    if (!noServer) await startDevServer();
  } catch (e) {
    console.error(`❌ Failed to start dev server: ${e.message}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  for (const [width, height, label] of [[375, 812, 'mobile'], [1280, 800, 'desktop']]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();

    try {
      const res = await page.goto(url, { timeout: 20000, waitUntil: 'networkidle' });
      const status = res?.status();

      const screenshotPath = `${outDir}/vqa-${projectName}-${label}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`📸 ${label} screenshot → ${screenshotPath}`);

      const results = await runChecks(page, `${label} (${width}px)`);
      results.status = status;
      results.screenshot = screenshotPath;

      checks.viewports.push(results);

      // Print results
      console.log(`\n── ${label} (${width}×${height}) ──`);
      results.pass.forEach(m => console.log(`  ✅ ${m}`));
      results.warn.forEach(m => console.log(`  ⚠️  ${m}`));
      results.fail.forEach(m => { console.log(`  ❌ ${m}`); if (exitCode < 2) exitCode = 2; });

    } catch (e) {
      console.log(`  ❌ Page load failed: ${e.message}`);
      exitCode = 2;
    } finally {
      await ctx.close();
    }
  }

  await browser.close();
  if (devServer) devServer.kill();

  // Write JSON report
  const reportPath = `${outDir}/vqa-${projectName}-report.json`;
  fs.writeFileSync(reportPath, JSON.stringify(checks, null, 2));

  // Summary
  const totalFail = checks.viewports.flatMap(v => v.fail || []).length;
  const totalWarn = checks.viewports.flatMap(v => v.warn || []).length;
  const totalPass = checks.viewports.flatMap(v => v.pass || []).length;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 ${projectName} visual QA — ${totalPass} pass, ${totalWarn} warn, ${totalFail} fail`);
  console.log(`📄 Report: ${reportPath}`);
  console.log(`📸 Screenshots:`);
  checks.viewports.forEach(v => v.screenshot && console.log(`   ${v.label}: ${v.screenshot}`));

  if (exitCode === 0 && totalWarn > 0) exitCode = 1;

  if (exitCode === 0) console.log(`\n✅ VISUAL QA PASSED — safe to push`);
  else if (exitCode === 1) console.log(`\n⚠️  VISUAL QA PASSED WITH WARNINGS — push allowed but review`);
  else console.log(`\n❌ VISUAL QA FAILED — fix contrast/layout issues before push`);

  process.exit(exitCode);
}

main().catch(e => { console.error(e); if (devServer) devServer.kill(); process.exit(2); });
