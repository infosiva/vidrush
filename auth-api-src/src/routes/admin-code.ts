import { Router } from 'express';
import crypto from 'crypto';
import db from '../db';

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY;
const CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h, fixed per requirement

db.exec(`
  CREATE TABLE IF NOT EXISTS guest_codes (
    code_hash   TEXT PRIMARY KEY,
    project     TEXT NOT NULL,
    tier        TEXT NOT NULL DEFAULT 'admin',
    ai_limit    INTEGER,
    expires_at  INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    redeemed_by TEXT,
    redeemed_at DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_guest_codes_project ON guest_codes(project);

  CREATE TABLE IF NOT EXISTS project_settings (
    project       TEXT PRIMARY KEY,
    guest_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const codeStmts = {
  insert: db.prepare<[string, string, string, number | null, number]>(
    'INSERT INTO guest_codes (code_hash, project, tier, ai_limit, expires_at) VALUES (?, ?, ?, ?, ?)'
  ),
  find: db.prepare<[string, string]>(
    'SELECT * FROM guest_codes WHERE code_hash = ? AND project = ?'
  ),
  redeem: db.prepare<[string, string]>(
    "UPDATE guest_codes SET redeemed_by = ?, redeemed_at = CURRENT_TIMESTAMP WHERE code_hash = ?"
  ),
  statusByFingerprint: db.prepare<[string, string]>(
    'SELECT * FROM guest_codes WHERE project = ? AND redeemed_by = ? ORDER BY redeemed_at DESC LIMIT 1'
  ),
};

const settingsStmts = {
  get: db.prepare<[string]>('SELECT guest_enabled FROM project_settings WHERE project = ?'),
  upsert: db.prepare<[string, number]>(
    `INSERT INTO project_settings (project, guest_enabled, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(project) DO UPDATE SET guest_enabled = excluded.guest_enabled, updated_at = CURRENT_TIMESTAMP`
  ),
  all: db.prepare('SELECT project, guest_enabled FROM project_settings'),
};

function isGuestEnabled(project: string): boolean {
  const row = settingsStmts.get.get(project) as { guest_enabled: number } | undefined;
  return row ? row.guest_enabled === 1 : true; // default ON — matches pre-toggle behavior
}

interface GuestCodeRow {
  code_hash: string;
  project: string;
  tier: string;
  ai_limit: number | null;
  expires_at: number;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// POST /admin-code/generate — hub-only, requires ADMIN_KEY. Scoped to one project.
router.post('/generate', (req, res) => {
  if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { project, tier, aiLimit } = req.body as { project?: string; tier?: string; aiLimit?: number };
  if (!project || typeof project !== 'string') {
    return res.status(400).json({ error: 'project required' });
  }

  const code = crypto.randomBytes(16).toString('hex'); // 128-bit, unguessable
  const expiresAt = Date.now() + CODE_TTL_MS;

  codeStmts.insert.run(hashCode(code), project, tier || 'admin', aiLimit ?? null, expiresAt);

  // Plaintext code returned once — never retrievable again, only the hash is stored.
  res.json({ code, project, tier: tier || 'admin', aiLimit: aiLimit ?? null, expiresAt });
});

// POST /admin-code/redeem — called by the target project's client/server on code entry.
router.post('/redeem', (req, res) => {
  const { code, project, fingerprint } = req.body as { code?: string; project?: string; fingerprint?: string };
  if (!code || !project || !fingerprint) {
    return res.status(400).json({ error: 'code, project, fingerprint required' });
  }

  if (!isGuestEnabled(project)) {
    return res.status(403).json({ valid: false, error: 'Guest access is disabled for this project' });
  }

  const row = codeStmts.find.get(hashCode(code), project) as GuestCodeRow | undefined;
  if (!row) return res.status(404).json({ valid: false, error: 'Invalid code for this project' });
  if (row.expires_at < Date.now()) return res.status(410).json({ valid: false, error: 'Code expired' });
  if (row.redeemed_by && row.redeemed_by !== fingerprint) {
    return res.status(409).json({ valid: false, error: 'Code already used' });
  }

  if (!row.redeemed_by) codeStmts.redeem.run(fingerprint, row.code_hash);

  res.json({ valid: true, tier: row.tier, aiLimit: row.ai_limit, expiresAt: row.expires_at });
});

// GET /admin-code/status?project=&fingerprint= — restore privilege on page reload.
router.get('/status', (req, res) => {
  const { project, fingerprint } = req.query as { project?: string; fingerprint?: string };
  if (!project || !fingerprint) return res.status(400).json({ error: 'project, fingerprint required' });

  if (!isGuestEnabled(project)) return res.json({ active: false });

  const row = codeStmts.statusByFingerprint.get(project, fingerprint) as GuestCodeRow | undefined;
  if (!row || row.expires_at < Date.now()) return res.json({ active: false });

  res.json({ active: true, tier: row.tier, aiLimit: row.ai_limit, expiresAt: row.expires_at });
});

// GET /admin-code/settings — hub-only, list guest_enabled flag for every project with a row (defaults ON if absent).
router.get('/settings', (req, res) => {
  if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = settingsStmts.all.all() as { project: string; guest_enabled: number }[];
  res.json({ settings: rows.map(r => ({ project: r.project, guestEnabled: r.guest_enabled === 1 })) });
});

// POST /admin-code/settings { project, guestEnabled } — hub-only, toggle guest access per project.
router.post('/settings', (req, res) => {
  if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { project, guestEnabled } = req.body as { project?: string; guestEnabled?: boolean };
  if (!project || typeof project !== 'string' || typeof guestEnabled !== 'boolean') {
    return res.status(400).json({ error: 'project (string) and guestEnabled (boolean) required' });
  }
  settingsStmts.upsert.run(project, guestEnabled ? 1 : 0);
  res.json({ project, guestEnabled });
});

export default router;
