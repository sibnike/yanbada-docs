import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Renderer, shared types and CSS live in docs/sites (the drop-in for mega-hub).
  // The app imports them directly so there is only one copy of that code.
  experimental: { externalDir: true },
  // Repo root, so Vercel file tracing can see ../../docs/sites when the
  // project Root Directory is apps/market.
  outputFileTracingRoot: path.join(here, '../..'),
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
