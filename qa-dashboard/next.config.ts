import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Playwright runs in Node.js API routes — disable webpack externals warning
  serverExternalPackages: ['playwright'],
}

export default nextConfig
