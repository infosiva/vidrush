import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

async function uploadFile(buffer: Buffer, mimeType: string): Promise<string> {
  const blob = new Blob([buffer.buffer as ArrayBuffer], { type: mimeType })
  const file = await replicate.files.create(blob)
  return file.urls.get
}

export async function restorePhoto(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  const imageUrl = await uploadFile(imageBuffer, mimeType)

  // Step 1: Real-ESRGAN — upscale + sharpen (works on any image)
  const upscaled = (await replicate.run(
    'cjwbw/real-esrgan:d0ee3d708c9b911f122a4ad90046c5d26a0293b99476d697f6bb7f2e251ce2d4',
    {
      input: {
        image: imageUrl,
        upscale: 2,
      },
    }
  ) as unknown) as string

  // Step 2: GFPGAN — face restoration on the upscaled result (optional, skip on failure)
  try {
    const restored = (await replicate.run(
      'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c',
      {
        input: {
          img: upscaled,
          version: 'v1.4',
          scale: 1,
        },
      }
    ) as unknown) as string
    return restored
  } catch {
    // No faces detected or model error — return upscaled result
    return upscaled
  }
}
