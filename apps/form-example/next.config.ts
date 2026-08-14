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
  // Трейсер standalone-вывода (@vercel/nft) не докопировал @swc/helpers из bun-хранилища
  // node_modules/.bun/ — контейнер падал в crash loop на старте: "Cannot find module
  // '.../next/node_modules/@swc/helpers/esm/_interop_require_default.js'" (staging, 2026-08-15).
  // См. .claude/docs/nextjs-standalone-tracing.md — тот же класс бага, что sharp/libvips.
  outputFileTracingIncludes: {
    '/**': ['../../node_modules/.bun/@swc+helpers@*/node_modules/@swc/helpers/**/*'],
  },
}

export default config
