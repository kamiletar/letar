import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  typescript: {
    // Typecheck выполняется отдельно через nx typecheck
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
}

export default config
