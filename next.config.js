/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // better-sqlite3 v12 now supports Node 25. Leaving true until all
    // TS strict errors are resolved across the codebase.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig


