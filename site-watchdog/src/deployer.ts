import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { SiteConfig, DeployResult } from './types.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_USER  = process.env.GITHUB_USER  || 'infosiva';

function run(cmd: string, cwd: string, timeout = 30000): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', timeout, stdio: ['pipe','pipe','pipe'] });
    return { ok: true, out: out.trim() };
  } catch (e: any) {
    return { ok: false, out: (e.stderr || e.stdout || e.message || '').toString().trim() };
  }
}

export async function deploySite(site: SiteConfig): Promise<DeployResult> {
  if (process.env.DRY_RUN === 'true') {
    console.log('  DRY RUN — skipping actual deployment');
    return { success: true, url: `${site.url} (dry run)` };
  }

  // Docker-based sites: git pull + docker-compose rebuild
  if (site.type === 'docker') {
    return deployDocker(site);
  }

  const deployTarget = site.type === 'cloudflare-pages' ? 'Cloudflare Pages' : 'Vercel';
  console.log(`\n🚀 Deploying ${site.name} via git push → GitHub → ${deployTarget}...`);

  const cwd = site.path;

  // 1. Ensure remote has auth token embedded (idempotent)
  const repoName = path.basename(cwd);
  const remoteUrl = `https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${repoName}.git`;
  run(`git remote set-url origin "${remoteUrl}"`, cwd);

  // 2. Configure git identity if not set
  run('git config user.email "info.siva@gmail.com"', cwd);
  run('git config user.name "Site Watchdog Bot"', cwd);

  // 3. Stage all changes
  const stageResult = run('git add -A', cwd);
  if (!stageResult.ok) {
    return { success: false, url: '', error: `git add failed: ${stageResult.out.slice(0, 200)}` };
  }

  // 4. Check if there's anything to commit
  const diffResult = run('git diff --cached --quiet', cwd, 5000);
  if (diffResult.ok) {
    // Exit code 0 means no diff — nothing staged
    console.log('  ℹ️  No staged changes — syncing with remote anyway');
  } else {
    // There are staged changes — commit them
    const today = new Date().toISOString().split('T')[0];
    const commitMsg = `watchdog: auto-improve ${site.name} ${today}`;
    const commitResult = run(`git commit -m "${commitMsg}"`, cwd);
    if (!commitResult.ok && !commitResult.out.includes('nothing to commit')) {
      return { success: false, url: '', error: `git commit failed: ${commitResult.out.slice(0, 200)}` };
    }
    console.log(`  📦 Committed: ${commitMsg}`);
  }

  // 5. Push to GitHub (Vercel auto-deploys from main)
  const pushResult = run('git push origin main', cwd, 60000);
  if (!pushResult.ok) {
    // Try pulling first if there's a divergence, then push
    console.log('  ⚠️  Push failed, trying pull --rebase first...');
    run('git pull --rebase origin main', cwd, 30000);
    const retryResult = run('git push origin main', cwd, 60000);
    if (!retryResult.ok) {
      return { success: false, url: '', error: `git push failed: ${retryResult.out.slice(0, 200)}` };
    }
  }

  if (site.type === 'cloudflare-pages') {
    console.log('  ✅ Pushed to GitHub → Cloudflare Pages building...');
    return { success: true, url: site.url };
  }

  console.log(`  ✅ Pushed to GitHub → Vercel building...`);

  // 6. Wait for Vercel to pick up the deploy (it triggers within ~10s of push)
  await new Promise(r => setTimeout(r, 15000));

  // 7. Check deployment status via Vercel API
  const deployUrl = await checkVercelDeploy(site);

  console.log(`  🌐 Live at: ${deployUrl}`);
  return { success: true, url: deployUrl };
}

async function deployDocker(site: SiteConfig): Promise<DeployResult> {
  console.log(`\n🐳 Deploying ${site.name} via Docker rebuild...`);
  const cwd = site.path;

  // Pull latest code
  const pullResult = run('git pull origin main', cwd, 30000);
  if (!pullResult.ok) {
    console.log(`  ⚠️ git pull failed (may be OK): ${pullResult.out.slice(0, 100)}`);
  }

  // Rebuild and restart containers
  const buildResult = run('docker-compose up -d --build', cwd, 120000);
  if (!buildResult.ok) {
    // Try docker compose (v2 syntax)
    const v2Result = run('docker compose up -d --build', cwd, 120000);
    if (!v2Result.ok) {
      return { success: false, url: '', error: `docker-compose failed: ${buildResult.out.slice(0, 200)}` };
    }
  }

  console.log(`  ✅ Docker containers rebuilt and restarted`);
  return { success: true, url: site.url };
}

async function checkVercelDeploy(site: SiteConfig): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return site.url;

  try {
    // Get latest deployment for the project
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${site.vercelProject}&limit=1&target=production`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return site.url;
    const data = await res.json() as any;
    const latest = data.deployments?.[0];

    if (latest) {
      // Wait up to 90s for it to go "READY"
      for (let i = 0; i < 9; i++) {
        const r = await fetch(`https://api.vercel.com/v13/deployments/${latest.uid}`,
          { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json() as any;
        if (d.readyState === 'READY') {
          return `https://${d.url}`;
        }
        if (d.readyState === 'ERROR') break;
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  } catch { /* fall through */ }

  return site.url;
}
