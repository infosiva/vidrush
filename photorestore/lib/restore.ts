/**
 * Photo restoration pipeline — fully free, no paid APIs.
 *
 * Fallback order (best → guaranteed):
 *   1. sczhou/CodeFormer        — HF Space, face restoration + enhancement
 *   2. avans06/GFPGAN-CodeFormer — HF Space, combined restoration
 *   3. sharp local               — CPU sharpen/enhance, always works
 */

import sharp from 'sharp'
import { Client } from '@gradio/client'

const HF_TIMEOUT = 55_000

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  return new Blob([buffer.buffer as ArrayBuffer], { type: mimeType })
}

async function urlToBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

function extractUrl(result: unknown): string {
  if (typeof result === 'string' && result.startsWith('http')) return result
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.url === 'string') return r.url
    if (typeof r.path === 'string') return r.path
    if (Array.isArray(r.value)) {
      const last = r.value[r.value.length - 1]
      return extractUrl(last)
    }
    if (r.value) return extractUrl(r.value)
  }
  return ''
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Provider 1: sczhou/CodeFormer ───────────────────────────────────────────
// Endpoint: /inference
// Params: image, pre_face_align (bool), background_enhance (bool),
//         face_upsample (bool), rescaling_factor (num), codeformer_fidelity (num)

async function restoreViaCodeFormer(buffer: Buffer, mimeType: string): Promise<Buffer> {
  console.log('[restore] trying sczhou/CodeFormer...')

  const work = async () => {
    const client = await Client.connect('sczhou/CodeFormer')
    const blob = bufferToBlob(buffer, mimeType)
    // Positional args: image, pre_face_align, background_enhance, face_upsample, rescaling_factor, codeformer_fidelity
    const result = await client.predict('/inference', [blob, false, true, true, 2, 0.5])

    const data = result.data as unknown[]
    const url = extractUrl(data[0])
    if (!url) throw new Error('No output URL from CodeFormer')

    const out = await urlToBuffer(url)
    console.log('[restore] CodeFormer success')
    return out
  }

  return withTimeout(work(), HF_TIMEOUT, 'CodeFormer')
}

// ─── Provider 2: avans06 combined GFPGAN/CodeFormer ──────────────────────────
// Endpoint: /inference

async function restoreViaAvans06(buffer: Buffer, mimeType: string): Promise<Buffer> {
  console.log('[restore] trying avans06/GFPGAN-CodeFormer...')

  const work = async () => {
    const client = await Client.connect(
      'avans06/Image_Face_Upscale_Restoration-GFPGAN-RestoreFormer-CodeFormer-GPEN'
    )
    const blob = bufferToBlob(buffer, mimeType)
    // Try predict with just the image — avans06 /inference may need different params
    const result = await client.predict('/inference', [blob])

    const data = result.data as unknown[]
    const url = extractUrl(data[0])
    if (!url) throw new Error('No output URL from avans06')

    const out = await urlToBuffer(url)
    console.log('[restore] avans06 success')
    return out
  }

  return withTimeout(work(), HF_TIMEOUT, 'avans06')
}

// ─── Provider 3: sharp local (guaranteed fallback) ───────────────────────────

async function restoreViaSharp(buffer: Buffer): Promise<Buffer> {
  console.log('[restore] falling back to sharp local processing...')
  const out = await sharp(buffer)
    .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.7 })
    .modulate({ brightness: 1.05, saturation: 1.15 })
    .normalize()
    .jpeg({ quality: 92 })
    .toBuffer()
  console.log('[restore] sharp-local success')
  return out
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function restorePhoto(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{ buffer: Buffer; provider: string }> {
  const providers: Array<{ name: string; fn: () => Promise<Buffer> }> = [
    { name: 'codeformer', fn: () => restoreViaCodeFormer(imageBuffer, mimeType) },
    { name: 'avans06-gfpgan', fn: () => restoreViaAvans06(imageBuffer, mimeType) },
    { name: 'sharp-local', fn: () => restoreViaSharp(imageBuffer) },
  ]

  for (const provider of providers) {
    try {
      const buffer = await provider.fn()
      return { buffer, provider: provider.name }
    } catch (err) {
      console.error(`[restore] ${provider.name} failed:`, err instanceof Error ? err.message : err)
    }
  }

  throw new Error('All restoration providers failed')
}
