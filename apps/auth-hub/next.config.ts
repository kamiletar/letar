import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Better Auth: trailing slash для корректных callback URLs
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // Транспиляция workspace библиотек
  transpilePackages: ['@letar/auth', '@letar/analytics', '@letar/chakra-provider', '@letar/email', '@letar/forms'],

  // Оптимизация bundle size
  optimizePackageImports: ['@chakra-ui/react', 'react-icons'],

  // geoip-lite содержит бинарные .dat файлы — не бандлить, оставить как runtime require
  serverExternalPackages: ['geoip-lite'],

  // Явно включаем geoip-lite в трассировку standalone output (включая .dat файлы)
  outputFileTracingIncludes: {
    '/**': ['./node_modules/geoip-lite/**'],
  },
}

export default nextConfig
