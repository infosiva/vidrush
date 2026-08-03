/**
 * Unified AI client — provider waterfall with hard timeouts.
 *
 * Order: GROQ → Gemini → Cerebras → Anthropic
 *
 * Each provider tries multiple models in order before giving up.
 * When a provider's quota is exhausted or it times out (45s), it falls
 * through to the next one automatically. Each provider also uses TokenManager
 * for multi-key rotation (e.g. GROQ_API_KEY, GROQ_API_KEY_1, GROQ_API_KEY_2).
 *
 * Models used (latest as of 2026):
 *   Groq:     llama-4-scout → llama-3.3-70b → qwen3-32b → llama-3.1-8b
 *   Gemini:   gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
 *   Cerebras: qwen-3-235b → gpt-oss-120b → llama3.1-8b
 *   Anthropic: claude-sonnet-4-6 (paid last resort)
 *
 * To add capacity: add more keys in .env using _1, _2 suffixes:
 *   GROQ_API_KEY_1=gsk_...    (create free at console.groq.com)
 *   GROQ_API_KEY_2=gsk_...
 *   GEMINI_API_KEY_1=AIza...  (create free at aistudio.google.com)
 *   CEREBRAS_API_KEY=csk_...  (create free at cloud.cerebras.ai)
 */
import Anthropic from '@anthropic-ai/sdk';
import { tokenManager } from './tokenManager.js';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  provider: string;
}

// ── Response cache — identical prompts never hit any API twice ────────────────
// TTL: 2 hours (site-watchdog runs once/day so cache is always fresh)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const _responseCache = new Map<string, { text: string; provider: string; expires: number }>();

function _getCached(key: string) {
  const e = _responseCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { _responseCache.delete(key); return null; }
  return e;
}

function _setCached(key: string, text: string, provider: string) {
  if (_responseCache.size > 200) _responseCache.delete(_responseCache.keys().next().value!);
  _responseCache.set(key, { text, provider, expires: Date.now() + CACHE_TTL_MS });
}

function _cacheKey(system: string, prompt: string, maxTokens: number): string {
  return `${maxTokens}::${system.slice(0, 80)}::${prompt.slice(0, 300)}`;
}

// ── Daily Claude budget guard ─────────────────────────────────────────────────
// claude-sonnet-4-6: ~$3/M input, $15/M output. Daily soft limit ~100k tokens ≈ $0.40/day.
const _claudeBudget = { used: 0, limit: 100_000 };
function _claudeOverBudget() { return _claudeBudget.used >= _claudeBudget.limit; }
function _recordClaude(i: number, o: number) {
  _claudeBudget.used += i + o;
  console.log(`    [Claude budget] used=${_claudeBudget.used} / ${_claudeBudget.limit} tokens today`);
}

// ── Context compressor — trims long histories before sending ──────────────────
// Keeps last 4 turns verbatim; older turns become a 1-line summary.
export function compressMessages(messages: AIMessage[]): AIMessage[] {
  if (messages.length <= 4) return messages;
  const keep = messages.slice(-4);
  const summary = messages.slice(0, -4)
    .filter(m => m.role === 'user')
    .map(m => m.content.slice(0, 100).replace(/\n/g, ' '))
    .join(' | ');
  return [
    { role: 'user',      content: `[Prior context summary]: ${summary}` },
    { role: 'assistant', content: 'Understood.' },
    ...keep,
  ];
}

// Hard timeout per model call — prevents a hung HTTP request from
// stalling the entire run for 20+ minutes.
const PROVIDER_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

// ── Skip patterns — move to next model/provider ───────────────────────────────
function shouldSkip(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('exhausted') || m.includes('rate_limit') || m.includes('rate limit') ||
    m.includes('quota') || m.includes('exceeded') || m.includes('billing') ||
    m.includes('credit') || m.includes('limit reached') || m.includes('timed out') ||
    m.includes('no keys') || m.includes('401') || m.includes('403') ||
    m.includes('invalid_api_key') || m.includes('not configured') ||
    m.includes('model_not_active') || m.includes('model not found') ||
    m.includes('does not exist') || m.includes('model_not_found') ||
    m.includes('not supported') || m.includes('overloaded') ||
    m.includes('service unavailable') || m.includes('529')
  );
}

// ── Generic OpenAI-compatible caller ─────────────────────────────────────────
async function callOpenAICompat(
  baseUrl: string,
  providerName: string,
  key: string,
  model: string,
  system: string,
  messages: AIMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`${providerName}/${model} ${res.status}: ${e.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// ── Groq — multiple models, each with key rotation ───────────────────────────
// Models tried in order: Llama 3.3 70b → Llama 3.1 8b
// Different models have independent rate-limit buckets on Groq.
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',                   // Proven workhorse
  'llama-3.1-8b-instant',                       // Fast small model, last resort
];

async function callGroq(system: string, messages: AIMessage[], maxTokens: number): Promise<string> {
  for (const model of GROQ_MODELS) {
    try {
      const result = await withTimeout(
        tokenManager.withRotation('GROQ', (key) =>
          callOpenAICompat('https://api.groq.com/openai/v1', 'Groq', key, model, system, messages, maxTokens)
        ),
        PROVIDER_TIMEOUT_MS, `GROQ/${model}`,
      );
      if (result) {
        if (model !== GROQ_MODELS[0]) console.log(`    [Groq model: ${model}]`);
        return result;
      }
    } catch (e: any) {
      const msg = e.message?.slice(0, 120) || '';
      if (shouldSkip(msg)) {
        console.log(`    [Groq ${model} unavailable — trying next Groq model]`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All Groq models exhausted');
}

// ── Gemini — upgraded to 2.5-flash with fallbacks ────────────────────────────
// gemini-2.5-flash is significantly smarter than 2.0-flash, still free
const GEMINI_MODELS = [
  'gemini-2.5-flash',      // Latest & smartest free model
  'gemini-2.0-flash',      // Previous gen, reliable
  'gemini-2.0-flash-lite', // Ultra-fast minimal fallback
];

async function callGemini(system: string, messages: AIMessage[], maxTokens: number): Promise<string> {
  for (const model of GEMINI_MODELS) {
    try {
      const result = await withTimeout(
        tokenManager.withRotation('GEMINI', (key) =>
          callOpenAICompat('https://generativelanguage.googleapis.com/v1beta/openai', 'Gemini', key, model, system, messages, maxTokens)
        ),
        PROVIDER_TIMEOUT_MS, `Gemini/${model}`,
      );
      if (result) {
        if (model !== GEMINI_MODELS[0]) console.log(`    [Gemini model: ${model}]`);
        return result;
      }
    } catch (e: any) {
      const msg = e.message?.slice(0, 120) || '';
      if (shouldSkip(msg)) {
        console.log(`    [Gemini ${model} unavailable — trying next Gemini model]`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All Gemini models exhausted');
}

// ── Cerebras — upgraded to Qwen-3-235b with fallbacks ────────────────────────
// Cerebras provides free ultra-fast inference for large models
const CEREBRAS_MODELS = [
  'qwen-3-235b-a22b-instruct-2507', // Massive Qwen3 MoE, very capable
  'gpt-oss-120b',                    // OpenAI OSS 120b
  'llama3.1-8b',                     // Fast small fallback
];

async function callCerebras(system: string, messages: AIMessage[], maxTokens: number): Promise<string> {
  for (const model of CEREBRAS_MODELS) {
    try {
      const result = await withTimeout(
        tokenManager.withRotation('CEREBRAS', (key) =>
          callOpenAICompat('https://api.cerebras.ai/v1', 'Cerebras', key, model, system, messages, maxTokens)
        ),
        PROVIDER_TIMEOUT_MS, `Cerebras/${model}`,
      );
      if (result) {
        if (model !== CEREBRAS_MODELS[0]) console.log(`    [Cerebras model: ${model}]`);
        return result;
      }
    } catch (e: any) {
      const msg = e.message?.slice(0, 120) || '';
      if (shouldSkip(msg)) {
        console.log(`    [Cerebras ${model} unavailable — trying next Cerebras model]`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All Cerebras models exhausted');
}

// ── Anthropic (paid last resort) with prompt caching + budget guard ───────────
async function callAnthropic(system: string, messages: AIMessage[], maxTokens: number): Promise<string> {
  if (_claudeOverBudget()) throw new Error('Claude daily budget exceeded — skipping to save cost');
  return withTimeout(
    tokenManager.withRotation('ANTHROPIC', async (key) => {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: Math.min(maxTokens, 1500), // hard cap — site-watchdog rarely needs more
        // Prompt caching: system prompt cached ~5 min on Anthropic infra.
        // Saves ~90% of system-prompt input tokens on repeated runs.
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: compressMessages(messages),
      });
      if (response.usage) _recordClaude(response.usage.input_tokens, response.usage.output_tokens);
      return response.content[0].type === 'text' ? response.content[0].text : '';
    }),
    PROVIDER_TIMEOUT_MS, 'Anthropic',
  );
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function callAI(
  system: string,
  userPrompt: string,
  maxTokens = 2048,
): Promise<AIResponse> {
  // Check response cache first — identical prompts never hit any API twice
  const cacheKey = _cacheKey(system, userPrompt, maxTokens);
  const cached = _getCached(cacheKey);
  if (cached) {
    console.log(`    [AI cache hit — 0 tokens used]`);
    return cached;
  }

  const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

  const providers = [
    { name: 'groq',      fn: () => callGroq(system, messages, maxTokens) },
    { name: 'gemini',    fn: () => callGemini(system, messages, maxTokens) },
    { name: 'cerebras',  fn: () => callCerebras(system, messages, maxTokens) },
    { name: 'anthropic', fn: () => callAnthropic(system, messages, maxTokens) },
  ];

  const skipped: string[] = [];

  for (const { name, fn } of providers) {
    try {
      const text = await fn();
      if (text) {
        if (skipped.length) console.log(`    [Fell back to ${name} after: ${skipped.join(' → ')} unavailable]`);
        else if (name !== 'groq') console.log(`    [AI: ${name}]`);
        _setCached(cacheKey, text, name);
        return { text, provider: name };
      }
    } catch (e: any) {
      const msg = e.message?.slice(0, 120) || '';
      if (shouldSkip(msg)) {
        console.log(`    [${name} unavailable (${msg.slice(0, 60)}) — trying next]`);
        skipped.push(name);
        continue;
      }
      throw e;
    }
  }

  throw new Error(`All AI providers exhausted or unavailable. Tried: ${providers.map(p => p.name).join(', ')}`);
}
