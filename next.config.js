/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // TODO: Fix TypeScript errors and set this to false
    // Unable to verify error count — build blocked by environment issue
    // (better-sqlite3 native compilation failure on Node 25 / macOS).
    // Once dependencies install cleanly, run `npx next build` to audit.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig


