import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  // outputFileTracing не докопировывает сгенерированный .prisma/client (WASM query-compiler)
  // в per-chunk alias-копию @prisma/client — без него prisma.*.findMany() падает с ECONNREFUSED
  // в рантайме, хотя build проходит без ошибок (инцидент 2026-07-12, form-example /products 500).
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/.prisma/client/**/*',
      './node_modules/.bun/@prisma+client@*/node_modules/.prisma/client/**/*',
    ],
  },
  typescript: {
    // Typecheck выполняется отдельно через nx typecheck
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
}

export default config
