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

  // Явно включаем geoip-lite в трассировку standalone output (включая .dat файлы)
  outputFileTracingIncludes: {
    '/**': ['./node_modules/geoip-lite/**'],
  },
}

export default nextConfig
