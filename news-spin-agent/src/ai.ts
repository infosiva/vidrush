/**
 * AI client — Groq → Gemini → Cerebras → Anthropic fallback chain.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface AIResponse { text: string; provider: string; }

const TIMEOUT_MS = 45_000;
const _claudeBudget = { used: 0, limit: 60_000 };

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

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const CEREBRAS_MODELS = ['llama3.1-8b'];

async function callGroq(sys: string, prompt: string, max: number): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ not configured');
  for (const model of GROQ_MODELS) {
    try { const r = await withTimeout(callOpenAICompat('https://api.groq.com/openai/v1', 'Groq', key, model, sys, prompt, max), TIMEOUT_MS, `Groq/${model}`); if (r) return r; } catch (e: any) { if (shouldSkip(e.message)) continue; throw e; }
  }
  throw new Error('All Groq models exhausted');
}

async function callGemini(sys: string, prompt: string, max: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini not configured');
  for (const model of GEMINI_MODELS) {
    try { const r = await withTimeout(callOpenAICompat('https://generativelanguage.googleapis.com/v1beta/openai', 'Gemini', key, model, sys, prompt, max), TIMEOUT_MS, `Gemini/${model}`); if (r) return r; } catch (e: any) { if (shouldSkip(e.message)) continue; throw e; }
  }
  throw new Error('All Gemini models exhausted');
}

async function callCerebras(sys: string, prompt: string, max: number): Promise<string> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('Cerebras not configured');
  for (const model of CEREBRAS_MODELS) {
    try { const r = await withTimeout(callOpenAICompat('https://api.cerebras.ai/v1', 'Cerebras', key, model, sys, prompt, max), TIMEOUT_MS, `Cerebras/${model}`); if (r) return r; } catch (e: any) { if (shouldSkip(e.message)) continue; throw e; }
  }
  throw new Error('All Cerebras models exhausted');
}

async function callAnthropic(sys: string, prompt: string, max: number): Promise<string> {
  if (_claudeBudget.used >= _claudeBudget.limit) throw new Error('Claude daily budget exceeded');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic not configured');
  const client = new Anthropic({ apiKey: key });
  const call = client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: Math.min(max, 2000),
    system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  }).then(res => {
    if (res.usage) _claudeBudget.used += res.usage.input_tokens + res.usage.output_tokens;
    return res.content[0].type === 'text' ? res.content[0].text : '';
  });
  return withTimeout(call, TIMEOUT_MS, 'Anthropic');
}

export async function callAI(system: string, prompt: string, maxTokens = 2048): Promise<AIResponse> {
  const providers = [
    { name: 'groq',      fn: () => callGroq(system, prompt, maxTokens) },
    { name: 'gemini',    fn: () => callGemini(system, prompt, maxTokens) },
    { name: 'cerebras',  fn: () => callCerebras(system, prompt, maxTokens) },
    { name: 'anthropic', fn: () => callAnthropic(system, prompt, maxTokens) },
  ];
  for (const { name, fn } of providers) {
    try { const text = await fn(); if (text) return { text, provider: name }; }
    catch (e: any) { const msg = (e.message || '').slice(0, 120); if (shouldSkip(msg)) continue; throw e; }
  }
  throw new Error('All AI providers exhausted');
}

export function parseJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON found');
  return JSON.parse(match[0]) as T;
}
