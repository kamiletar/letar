import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Better Auth: trailing slash для корректных callback URLs
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // Оптимизация bundle size (ключ живёт в experimental — на верхнем уровне Next его игнорирует)
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'react-icons'],
  },

  // geoip-lite содержит бинарные .dat файлы — не бандлить, оставить как runtime require
  serverExternalPackages: ['geoip-lite'],

  // Явно включаем geoip-lite в трассировку standalone output (включая .dat файлы).
  // @swc/helpers — трейсер (@vercel/nft) не докопировал пакет в .next/standalone при первом
  // полном передеплое после долгого простоя контейнера (инцидент aboi/time 2026-08-18…19,
  // MODULE_NOT_FOUND на _interop_require_default.js; auth-hub — тот же случай, 2026-08-20).
  // См. nextjs-standalone-tracing.md. Глоб сужен до node_modules/@swc/helpers внутри
  // bun-директории пакета — широкий `@swc+helpers*/**/*` матчит и вложенный `node_modules/tslib`
  // (симлинк-директория), Turbopack падает при чтении её как файла.
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/geoip-lite/**',
      '../../node_modules/.bun/@swc+helpers*/node_modules/@swc/helpers/**/*',
    ],
  },
}

export default nextConfig
