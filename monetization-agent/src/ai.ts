/**
 * AI client — smart model selection + fallback chain.
 *
 * Model routing strategy:
 *   'fast'     → small/instant models (Groq 8b, Gemini flash-lite, Cerebras 8b)
 *   'balanced' → mid-tier (Groq 70b, Gemini flash, Cerebras 120b)      [default]
 *   'best'     → largest available (Groq scout/qwen, Gemini 2.5, Claude)
 *
 * The caller passes a `quality` hint; the router picks the right model tier
 * within each provider, then falls back across providers if one fails.
 */
import Anthropic from '@anthropic-ai/sdk';

export type Quality = 'fast' | 'balanced' | 'best';
export interface AIResponse { text: string; provider: string; model: string; }

const TIMEOUT_MS = 45_000;
const _claudeBudget = { used: 0, limit: 80_000 };

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
    m.includes('model_not_active') || m.includes('model not found') ||
    m.includes('does not exist') || m.includes('model_not_found')
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

// ── Model tiers per provider ──────────────────────────────────────────────────
// Ordered best→worst within each tier so first success wins
const GROQ_TIERS: Record<Quality, string[]> = {
  fast:     ['llama-3.1-8b-instant'],
  balanced: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  best:     ['llama-3.3-70b-versatile'],
};

const GEMINI_TIERS: Record<Quality, string[]> = {
  fast:     ['gemini-2.0-flash-lite'],
  balanced: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  best:     ['gemini-2.5-flash', 'gemini-2.0-flash'],
};

const CEREBRAS_TIERS: Record<Quality, string[]> = {
  fast:     ['llama3.1-8b'],
  balanced: ['gpt-oss-120b', 'llama3.1-8b'],
  best:     ['qwen-3-235b-a22b-instruct-2507', 'gpt-oss-120b'],
};

const CLAUDE_TIERS: Record<Quality, string> = {
  fast:     'claude-haiku-4-5-20251001',
  balanced: 'claude-haiku-4-5-20251001',
  best:     'claude-sonnet-4-6',
};

// ── Provider implementations ──────────────────────────────────────────────────
async function callGroq(quality: Quality, system: string, prompt: string, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ not configured');
  for (const model of GROQ_TIERS[quality]) {
    try {
      const text = await withTimeout(
        callOpenAICompat('https://api.groq.com/openai/v1', 'Groq', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Groq/${model}`,
      );
      if (text) return { text, model };
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { console.log(`    [Groq ${model} skip]`); continue; }
      throw e;
    }
  }
  throw new Error('All Groq models exhausted');
}

async function callGemini(quality: Quality, system: string, prompt: string, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini not configured');
  for (const model of GEMINI_TIERS[quality]) {
    try {
      const text = await withTimeout(
        callOpenAICompat('https://generativelanguage.googleapis.com/v1beta/openai', 'Gemini', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Gemini/${model}`,
      );
      if (text) return { text, model };
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { continue; }
      throw e;
    }
  }
  throw new Error('All Gemini models exhausted');
}

async function callCerebras(quality: Quality, system: string, prompt: string, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('Cerebras not configured');
  for (const model of CEREBRAS_TIERS[quality]) {
    try {
      const text = await withTimeout(
        callOpenAICompat('https://api.cerebras.ai/v1', 'Cerebras', key, model, system, prompt, maxTokens),
        TIMEOUT_MS, `Cerebras/${model}`,
      );
      if (text) return { text, model };
    } catch (e: any) {
      if (shouldSkip(e.message || '')) { continue; }
      throw e;
    }
  }
  throw new Error('All Cerebras models exhausted');
}

async function callAnthropic(quality: Quality, system: string, prompt: string, maxTokens: number): Promise<{ text: string; model: string }> {
  if (_claudeBudget.used >= _claudeBudget.limit) throw new Error('Claude daily budget exceeded');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic not configured');
  const model = CLAUDE_TIERS[quality];
  const client = new Anthropic({ apiKey: key });
  const call = client.messages.create({
    model,
    max_tokens: Math.min(maxTokens, 2000),
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  }).then(res => {
    if (res.usage) { _claudeBudget.used += res.usage.input_tokens + res.usage.output_tokens; }
    return res.content[0].type === 'text' ? res.content[0].text : '';
  });
  const text = await withTimeout(call, TIMEOUT_MS, 'Anthropic');
  return { text, model };
}

// ── Smart router ──────────────────────────────────────────────────────────────
// Provider order: Groq (fastest free) → Gemini (generous free tier) →
//                 Cerebras (fast inference) → Anthropic (paid, last resort)
export async function callAI(
  system: string,
  prompt: string,
  maxTokens = 2048,
  quality: Quality = 'balanced',
): Promise<AIResponse> {
  const providers = [
    { name: 'groq',      fn: () => callGroq(quality, system, prompt, maxTokens) },
    { name: 'gemini',    fn: () => callGemini(quality, system, prompt, maxTokens) },
    { name: 'cerebras',  fn: () => callCerebras(quality, system, prompt, maxTokens) },
    { name: 'anthropic', fn: () => callAnthropic(quality, system, prompt, maxTokens) },
  ];

  const skipped: string[] = [];
  for (const { name, fn } of providers) {
    try {
      const { text, model } = await fn();
      if (text) {
        if (skipped.length) {
          console.log(`    [Fell back to ${name}/${model} after: ${skipped.join(' → ')}]`);
        }
        return { text, provider: name, model };
      }
    } catch (e: any) {
      const msg = (e.message || '').slice(0, 120);
      if (shouldSkip(msg)) { skipped.push(name); continue; }
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
