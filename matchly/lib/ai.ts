/**
 * lib/ai.ts — Universal AI client (canonical template)
 *
 * FULLY DYNAMIC — provider list, model tiers, and fallback ORDER
 * are all driven by Edge Config. Add a new provider tomorrow with
 * zero code changes: just update Edge Config JSON.
 *
 * Default fallback chain (free-first, paid last):
 *   1.  Ollama      local, 100% free
 *   2.  Groq        free tier — fastest inference
 *   3.  Gemini      free tier — Google
 *   4.  Cerebras    free tier — fast
 *   5.  Together    free tier — 25+ open models
 *   6.  OpenRouter  aggregator — cheapest available, single key
 *   7.  Mistral     free tier — la-plateforme
 *   8.  NVidia NIM  free tier — Llama/Phi/Qwen
 *   9.  Kimi        free tier — Moonshot, long-context king
 *  10.  DeepSeek    ~free — $0.07/1M input tokens
 *  11.  Perplexity  sonar models, free tier
 *  12.  xAI Grok    free tier
 *  13.  Cohere      free tier — Command-R
 *  14.  OpenAI      paid, $5 credit on new accounts
 *  15.  Anthropic   paid, last resort
 *
 * Edge Config keys:
 *   fallback_order   — array of provider names (overrides default above)
 *   <provider>_tiers — { fast, balanced, best } model arrays
 *   disabled_providers — array of provider names to skip entirely
 *
 * Key naming: <PROVIDER>_API_KEY, <PROVIDER>_API_KEY_1 ... _10
 * Special: OPENROUTER_API_KEY, XAI_API_KEY, DEEPSEEK_API_KEY,
 *          TOGETHER_API_KEY, PERPLEXITY_API_KEY, COHERE_API_KEY
 *
 * Usage:
 *   import { callAI, aiChat, aiCached } from '@/lib/ai'
 *   const reply = await aiChat(messages)
 *   const plan  = await aiChat(messages, system, 2048, 'best')
 */


// ── Types ─────────────────────────────────────────────────────────────────────
export type Quality = 'fast' | 'balanced' | 'best'
type Msg = { role: 'user' | 'assistant'; content: string }
export interface AIResponse { text: string; provider: string; model: string }

// ── Default model tiers ───────────────────────────────────────────────────────
// All overridable via Edge Config — these are just sensible defaults

const DEFAULTS: Record<string, { tiers: Record<Quality, string[]>; baseUrl: string; keyEnv: string }> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ',
    tiers: {
      fast:     ['llama-3.1-8b-instant', 'gemma2-9b-it'],
      balanced: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
      best:     ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    },
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyEnv: 'GEMINI',
    tiers: {
      fast:     ['gemini-2.0-flash-lite'],
      balanced: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
      best:     ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    },
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    keyEnv: 'CEREBRAS',
    tiers: {
      fast:     ['llama3.1-8b'],
      balanced: ['gpt-oss-120b', 'llama3.1-8b'],
      best:     ['qwen-3-235b-a22b-instruct-2507', 'gpt-oss-120b'],
    },
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    keyEnv: 'TOGETHER',
    tiers: {
      fast:     ['meta-llama/Llama-3.2-3B-Instruct-Turbo'],
      balanced: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
      best:     ['meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
    },
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER',
    tiers: {
      fast:     ['meta-llama/llama-3.2-3b-instruct:free', 'mistralai/mistral-7b-instruct:free'],
      balanced: ['meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen-2.5-72b-instruct:free'],
      best:     ['meta-llama/llama-4-scout:free', 'deepseek/deepseek-chat-v3-0324:free', 'google/gemma-3-27b-it:free'],
    },
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    keyEnv: 'MISTRAL',
    tiers: {
      fast:     ['mistral-small-latest'],
      balanced: ['mistral-medium-latest', 'mistral-small-latest'],
      best:     ['mistral-large-latest', 'mistral-medium-latest'],
    },
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    keyEnv: 'NVIDIA',
    tiers: {
      fast:     ['microsoft/phi-4-mini-instruct'],
      balanced: ['qwen/qwen2.5-72b-instruct', 'nvidia/llama-3.3-nemotron-super-49b-v1'],
      best:     ['meta/llama-3.1-405b-instruct', 'mistralai/mistral-large-2-instruct'],
    },
  },
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    keyEnv: 'KIMI',
    tiers: {
      fast:     ['moonshot-v1-8k'],
      balanced: ['moonshot-v1-32k'],
      best:     ['moonshot-v1-128k'],
    },
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK',
    tiers: {
      fast:     ['deepseek-chat'],
      balanced: ['deepseek-chat'],
      best:     ['deepseek-reasoner', 'deepseek-chat'],
    },
  },
  perplexity: {
    baseUrl: 'https://api.perplexity.ai',
    keyEnv: 'PERPLEXITY',
    tiers: {
      fast:     ['sonar'],
      balanced: ['sonar-pro'],
      best:     ['sonar-reasoning-pro', 'sonar-pro'],
    },
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    keyEnv: 'XAI',
    tiers: {
      fast:     ['grok-3-mini-fast'],
      balanced: ['grok-3-mini'],
      best:     ['grok-3', 'grok-3-mini'],
    },
  },
  cohere: {
    baseUrl: 'https://api.cohere.com/compatibility/v1',
    keyEnv: 'COHERE',
    tiers: {
      fast:     ['command-r'],
      balanced: ['command-r-plus'],
      best:     ['command-a-03-2025', 'command-r-plus'],
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI',
    tiers: {
      fast:     ['gpt-4o-mini'],
      balanced: ['gpt-4o-mini', 'gpt-4o'],
      best:     ['gpt-4o', 'o4-mini'],
    },
  },
}

// Ollama local tiers (separate — no API key, no baseUrl via DEFAULTS)
const OLLAMA_TIERS: Record<Quality, string[]> = {
  fast:     ['gemma3:4b', 'llama3.2:latest'],
  balanced: ['qwen3:8b', 'gemma3:12b', 'llama3.2:latest'],
  best:     ['qwen3:14b', 'gemma3:27b', 'llama3.3:latest'],
}

// Anthropic (special — uses SDK not openai-compat)
const CLAUDE_TIERS: Record<Quality, string> = {
  fast:     'claude-haiku-4-5-20251001',
  balanced: 'claude-haiku-4-5-20251001',
  best:     'claude-sonnet-4-6',
}

// Default provider order — overridable entirely via Edge Config `fallback_order`
const DEFAULT_ORDER = [
  'ollama',
  'groq', 'gemini', 'cerebras', 'together',
  'openrouter',
  'mistral', 'nvidia', 'kimi', 'deepseek',
  'perplexity', 'xai', 'cohere',
  'openai', 'anthropic',
]

// ── Edge Config (hot-reloads every 5 min) ────────────────────────────────────
interface EdgeCfg {
  fallback_order?: string[]
  disabled_providers?: string[]
  groq_tiers?: Record<Quality, string[]>
  gemini_tiers?: Record<Quality, string[]>
  cerebras_tiers?: Record<Quality, string[]>
  together_tiers?: Record<Quality, string[]>
  openrouter_tiers?: Record<Quality, string[]>
  mistral_tiers?: Record<Quality, string[]>
  nvidia_tiers?: Record<Quality, string[]>
  kimi_tiers?: Record<Quality, string[]>
  deepseek_tiers?: Record<Quality, string[]>
  perplexity_tiers?: Record<Quality, string[]>
  xai_tiers?: Record<Quality, string[]>
  cohere_tiers?: Record<Quality, string[]>
  openai_tiers?: Record<Quality, string[]>
  claude_tiers?: Record<Quality, string>
  // future providers — any key ending in _tiers auto-discovered
  [key: string]: unknown
}

let _ecCache: EdgeCfg | null = null
let _ecAt = 0
const EC_TTL = 5 * 60 * 1000

async function getEdgeConfig(): Promise<EdgeCfg> {
  if (_ecCache && Date.now() - _ecAt < EC_TTL) return _ecCache
  const connStr = process.env.EDGE_CONFIG
  if (!connStr) { _ecCache = {}; _ecAt = Date.now(); return _ecCache }
  try {
    const url   = new URL(connStr)
    const ecId  = url.pathname.replace('/', '')
    const token = url.searchParams.get('token')
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${ecId}/items`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } } as RequestInit,
    )
    if (!res.ok) throw new Error(`EC ${res.status}`)
    const items: Array<{ key: string; value: unknown }> = await res.json()
    _ecCache = Object.fromEntries(items.map(({ key, value }) => [key, value])) as EdgeCfg
    _ecAt = Date.now()
    console.log('[AI] Edge Config loaded — providers:', _ecCache.fallback_order ?? 'default order')
  } catch (e) {
    console.warn('[AI] Edge Config fetch failed, using defaults:', e)
    _ecCache = {}
    _ecAt = Date.now()
  }
  return _ecCache
}

// ── Key rotation ──────────────────────────────────────────────────────────────
function getKeys(envPrefix: string): string[] {
  const keys: string[] = []
  const base = process.env[`${envPrefix}_API_KEY`] || process.env[`${envPrefix}_TOKEN`]
  if (base) keys.push(base)
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`${envPrefix}_API_KEY_${i}`] || process.env[`${envPrefix}_TOKEN_${i}`]
    if (!k) break
    keys.push(k)
  }
  return [...new Set(keys)]
}

// ── Error classification ──────────────────────────────────────────────────────
function isSkippable(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('exhausted') || m.includes('rate_limit') || m.includes('rate limit') ||
    m.includes('quota') || m.includes('exceeded') || m.includes('billing') ||
    m.includes('credit') || m.includes('limit reached') || m.includes('timed out') ||
    m.includes('401') || m.includes('403') || m.includes('invalid_api_key') ||
    m.includes('unauthorized') || m.includes('not configured') || m.includes('no keys') ||
    m.includes('model_not_active') || m.includes('model not found') ||
    m.includes('does not exist') || m.includes('model_not_found') ||
    m.includes('not supported') || m.includes('overloaded') ||
    m.includes('service unavailable') || m.includes('529') ||
    m.includes('timeout') || m.includes('econnrefused') || m.includes('enotfound')
  )
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
const TIMEOUT_MS = 28_000

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${label} timed out`)), TIMEOUT_MS)
    p.then(v => { clearTimeout(t); res(v) }, e => { clearTimeout(t); rej(e) })
  })
}

// ── OpenAI-compatible fetch ───────────────────────────────────────────────────
async function callOAICompat(
  baseUrl: string, name: string, key: string, model: string,
  system: string, messages: Msg[], maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      // OpenRouter requires these for rate-limit tiers
      ...(baseUrl.includes('openrouter') ? { 'HTTP-Referer': 'https://nammatamil.live', 'X-Title': 'NammaTamil' } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) {
    const e = await res.text()
    throw new Error(`${name}/${model} ${res.status}: ${e.slice(0, 200)}`)
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function callOllama(q: Quality, system: string, msgs: Msg[], max: number) {
  const host = process.env.OLLAMA_HOST
  if (!host) throw new Error('OLLAMA_HOST not set')
  for (const model of OLLAMA_TIERS[q]) {
    try {
      const text = await withTimeout(callOAICompat(`${host}/v1`, 'Ollama', '', model, system, msgs, max), `Ollama/${model}`)
      if (text) { console.log(`[AI] Ollama/${model}`); return { text, model } }
    } catch (e) { console.warn(`[AI] Ollama/${model}: ${(e as Error).message?.slice(0, 60)}`); continue }
  }
  throw new Error('Ollama: no model responded')
}

// ── Generic OpenAI-compat provider ───────────────────────────────────────────
async function callGeneric(
  providerId: string, q: Quality,
  system: string, msgs: Msg[], max: number,
  ec: EdgeCfg,
): Promise<{ text: string; model: string }> {
  const def = DEFAULTS[providerId]
  if (!def) throw new Error(`Unknown provider: ${providerId}`)

  // Model list: Edge Config overrides default
  const ecTiers = ec[`${providerId}_tiers`] as Record<Quality, string[]> | undefined
  const models = ecTiers?.[q] ?? def.tiers[q]

  const keys = getKeys(def.keyEnv)
  if (!keys.length) throw new Error(`${providerId}: no API key`)

  for (const model of models) {
    for (const key of keys) {
      try {
        const text = await withTimeout(callOAICompat(def.baseUrl, providerId, key, model, system, msgs, max), `${providerId}/${model}`)
        if (text) return { text, model }
      } catch (e) {
        const msg = (e as Error).message ?? ''
        if (isSkippable(msg)) { console.warn(`[AI] ${providerId}/${model} skip: ${msg.slice(0, 80)}`); continue }
        throw e
      }
    }
  }
  throw new Error(`${providerId}: all models/keys exhausted`)
}

// ── Anthropic (SDK) ───────────────────────────────────────────────────────────
async function callAnthropic(q: Quality, system: string, msgs: Msg[], max: number, ec: EdgeCfg) {
  const key = getKeys('ANTHROPIC')[0]
  if (!key) throw new Error('ANTHROPIC: no key')
  const model = (ec.claude_tiers ?? CLAUDE_TIERS)[q] as string
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: key })
  const params: Parameters<typeof client.messages.create>[0] = { model, max_tokens: max, system, messages: msgs }
  if (q === 'best') (params as unknown as Record<string, unknown>).thinking = { type: 'enabled', budget_tokens: Math.min(8000, Math.floor(max / 2)) }
  const res = await withTimeout(client.messages.create(params), 'Anthropic') as { content: Array<{ type: string; text?: string }> }
  const textBlock = res.content.find(b => b.type === 'text')
  return { text: textBlock?.text ?? res.content[0]?.text ?? '', model }
}

// ── Core callAI ───────────────────────────────────────────────────────────────
export async function callAI(
  system: string,
  messages: Msg[],
  maxTokens = 1024,
  quality: Quality = 'balanced',
): Promise<AIResponse> {
  const ec = await getEdgeConfig()

  // Provider order: Edge Config → default
  const order: string[] = (ec.fallback_order ?? DEFAULT_ORDER) as string[]
  const disabled = new Set<string>((ec.disabled_providers ?? []) as string[])

  const tried: string[] = []

  for (const id of order) {
    if (disabled.has(id)) continue

    try {
      let result: { text: string; model: string }

      if (id === 'ollama') {
        result = await callOllama(quality, system, messages, maxTokens)
      } else if (id === 'anthropic') {
        result = await callAnthropic(quality, system, messages, maxTokens, ec)
      } else {
        result = await callGeneric(id, quality, system, messages, maxTokens, ec)
      }

      if (result.text) {
        if (tried.length) console.warn(`[AI] fell back to ${id}/${result.model} after: ${tried.join(' → ')}`)
        return { text: result.text, provider: id, model: result.model }
      }
    } catch (e) {
      const msg = ((e as Error).message ?? '').slice(0, 100)
      tried.push(`${id}(${msg.slice(0, 40)})`)
      if (!isSkippable(msg) && !msg.includes('no API key') && !msg.includes('not set')) {
        console.warn(`[AI] ${id} error — skipping. ${msg}`)
      }
    }
  }

  throw new Error(`All AI providers exhausted. Tried: ${tried.join(' | ')}`)
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export async function aiChat(
  messages: Msg[],
  systemPrompt?: string,
  maxTokens = 700,
  quality: Quality = 'balanced',
): Promise<string> {
  const system = systemPrompt ?? 'You are a helpful AI assistant.'
  const { text } = await callAI(system, messages, maxTokens, quality)
  return text
}

// ── In-memory response cache (1h TTL) ────────────────────────────────────────
const _cache = new Map<string, { text: string; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000

export async function aiCached(key: string, fn: () => Promise<string>): Promise<string> {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.text
  const text = await fn()
  _cache.set(key, { text, ts: Date.now() })
  return text
}

// ── Debug helper ──────────────────────────────────────────────────────────────
export async function getProviderStatus(): Promise<Record<string, { hasKey: boolean; models: string[] }>> {
  const ec = await getEdgeConfig()
  const order = (ec.fallback_order ?? DEFAULT_ORDER) as string[]
  const status: Record<string, { hasKey: boolean; models: string[] }> = {}
  for (const id of order) {
    if (id === 'ollama') { status[id] = { hasKey: !!process.env.OLLAMA_HOST, models: OLLAMA_TIERS.balanced }; continue }
    if (id === 'anthropic') { status[id] = { hasKey: !!getKeys('ANTHROPIC').length, models: [CLAUDE_TIERS.balanced] }; continue }
    const def = DEFAULTS[id]
    if (!def) continue
    const ecTiers = ec[`${id}_tiers`] as Record<Quality, string[]> | undefined
    status[id] = { hasKey: !!getKeys(def.keyEnv).length, models: ecTiers?.balanced ?? def.tiers.balanced }
  }
  return status
}
