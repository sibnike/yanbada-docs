/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Renderer, shared types and CSS live in docs/sites (the drop-in for mega-hub).
  // The app imports them directly so there is only one copy of that code.
  experimental: { externalDir: true },
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
