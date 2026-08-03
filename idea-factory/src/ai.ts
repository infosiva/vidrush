/**
 * AI client — Groq → Gemini → Cerebras → Anthropic fallback chain.
 * Same pattern as site-watchdog/src/ai.ts, trimmed for idea-factory needs.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface AIResponse {
  text: string;
  provider: string;
}

// ── Response cache (1h TTL) ───────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000;
const _cache = new Map<string, { text: string; provider: string; expires: number }>();

function _getCached(key: string) {
  const e = _cache.get(key);
  if (!e || Date.now() > e.expires) { _cache.delete(key); return null; }
  return e;
}
function _setCached(key: string, text: string, provider: string) {
  if (_cache.size > 100) _cache.delete(_cache.keys().next().value!);
  _cache.set(key, { text, provider, expires: Date.now() + CACHE_TTL_MS });
}
function _cacheKey(system: string, prompt: string) {
  return `${system.slice(0, 60)}::${prompt.slice(0, 200)}`;
}

// ── Budget guard for Anthropic ────────────────────────────────────────────────
const _claudeBudget = { used: 0, limit: 80_000 };
function _overBudget() { return _claudeBudget.used >= _claudeBudget.limit; }
function _recordClaude(i: number, o: number) {
  _claudeBudget.used += i + o;
  console.log(`    [Claude budget] ${_claudeBudget.used}/${_claudeBudget.limit}`);
}

const TIMEOUT_MS = 45_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function shouldSkip(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('exhausted') || m.includes('rate_limit') || m.includes('rate limit') ||
    m.includes('quota') || m.includes('exceeded') || m.includes('billing') ||
    m.includes('credit') || m.includes('timed out') || m.includes('401') ||
    m.includes('403') || m.includes('invalid_api_key') || m.includes('not configured') ||
    m.includes('overloaded') || m.includes('service unavailable') || m.includes('529') ||
    m.includes('model_not_active') || m.includes('model not found') || m.includes('model_not_found') ||
    m.includes('404')
  );
}

async function callOpenAICompat(
  baseUrl: string, name: string, key: string, model: string,
  system: string, prompt: string, maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`${name}/${model} ${res.status}: ${e.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// ── Providers ─────────────────────────────────────────────────────────────────

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

async function callGroq(system: string, prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ not configured');
  for (const model of GROQ_MODELS) {
    try {
      const result = await withTimeout(
        callOpenAICompat('https://api.groq.com/openai/v1', 'Groq', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Groq/${model}`,
      );
      if (result) return result;
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { console.log(`    [Groq ${model} skip]`); continue; }
      throw e;
    }
  }
  throw new Error('All Groq models exhausted');
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

async function callGemini(system: string, prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini not configured');
  for (const model of GEMINI_MODELS) {
    try {
      const result = await withTimeout(
        callOpenAICompat('https://generativelanguage.googleapis.com/v1beta/openai', 'Gemini', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Gemini/${model}`,
      );
      if (result) return result;
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { console.log(`    [Gemini ${model} skip]`); continue; }
      throw e;
    }
  }
  throw new Error('All Gemini models exhausted');
}

const CEREBRAS_MODELS = ['gpt-oss-120b', 'zai-glm-4.7', 'gemma-4-31b'];

async function callCerebras(system: string, prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('Cerebras not configured');
  for (const model of CEREBRAS_MODELS) {
    try {
      const result = await withTimeout(
        callOpenAICompat('https://api.cerebras.ai/v1', 'Cerebras', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Cerebras/${model}`,
      );
      if (result) return result;
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { console.log(`    [Cerebras ${model} skip]`); continue; }
      throw e;
    }
  }
  throw new Error('All Cerebras models exhausted');
}

async function callAnthropic(system: string, prompt: string, maxTokens: number): Promise<string> {
  if (_overBudget()) throw new Error('Claude daily budget exceeded');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic not configured');
  const client = new Anthropic({ apiKey: key });
  const call = client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: Math.min(maxTokens, 2000),
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  }).then(res => {
    if (res.usage) _recordClaude(res.usage.input_tokens, res.usage.output_tokens);
    return res.content[0].type === 'text' ? res.content[0].text : '';
  });
  return withTimeout(call, TIMEOUT_MS, 'Anthropic');
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function callAI(
  system: string,
  prompt: string,
  maxTokens = 2048,
): Promise<AIResponse> {
  const key = _cacheKey(system, prompt);
  const cached = _getCached(key);
  if (cached) { console.log('    [AI cache hit]'); return cached; }

  const providers = [
    { name: 'groq',      fn: () => callGroq(system, prompt, maxTokens) },
    { name: 'gemini',    fn: () => callGemini(system, prompt, maxTokens) },
    { name: 'cerebras',  fn: () => callCerebras(system, prompt, maxTokens) },
    { name: 'anthropic', fn: () => callAnthropic(system, prompt, maxTokens) },
  ];

  const skipped: string[] = [];
  for (const { name, fn } of providers) {
    try {
      const text = await fn();
      if (text) {
        if (skipped.length) console.log(`    [Fell back to ${name} after: ${skipped.join(' → ')}]`);
        _setCached(key, text, name);
        return { text, provider: name };
      }
    } catch (e: any) {
      const msg = (e.message || '').slice(0, 120);
      if (shouldSkip(msg)) { console.log(`    [${name} unavailable — ${msg.slice(0, 60)}]`); skipped.push(name); continue; }
      throw e;
    }
  }
  throw new Error('All AI providers exhausted');
}

export function parseJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON found in AI response');
  return JSON.parse(match[0]) as T;
}
