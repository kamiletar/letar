import type { NextConfig } from 'next'

const config: NextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  typescript: {
    // Typecheck выполняется отдельно через nx typecheck
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
  // instrumentation-client.ts импортирует libs/glitchtip — файл вне apps/form-example.
  // Без transpilePackages Next.js ограничивает свой ts/js loader `include: [dir]`
  // (см. shouldIncludeExternalDirs в next/dist/build/webpack-config.js) и молча
  // отказывается обрабатывать внешние .ts — «no loaders configured».
  transpilePackages: [
    '@letar/analytics',
    '@letar/demo-protection',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/glitchtip',
    '@letar/pg-url',
    '@letar/seo',
  ],
  // Трейсер standalone-вывода (@vercel/nft) не докопировал @swc/helpers из bun-хранилища
  // node_modules/.bun/ — контейнер падал в crash loop на старте: "Cannot find module
  // '.../next/node_modules/@swc/helpers/esm/_interop_require_default.js'" (staging, 2026-08-15).
  // См. .claude/docs/nextjs-standalone-tracing.md — тот же класс бага, что sharp/libvips.
  outputFileTracingIncludes: {
    '/**': ['../../node_modules/.bun/@swc+helpers@*/node_modules/@swc/helpers/**/*'],
  },
}

export default config
