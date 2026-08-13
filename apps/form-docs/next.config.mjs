import { createMDX } from 'fumadocs-mdx/next'

// macro: false — фича fumadocs-mdx/macro не используется в form-docs, а её дефолтный
// include (**/*.ts, **/*.tsx по всему workspace) цепляет обычные TS-файлы вроде
// libs/glitchtip/src/client/index.ts и падает на `export interface`
const withMDX = createMDX({ macro: false })

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  typescript: {
    // Typecheck выполняется отдельно через nx typecheck
    ignoreBuildErrors: true,
  },
  // instrumentation-client.ts импортирует libs/glitchtip — файл вне apps/form-docs.
  // Без transpilePackages Next.js ограничивает свой ts/js loader `include: [dir]`
  // (см. shouldIncludeExternalDirs в next/dist/build/webpack-config.js) и молча
  // отказывается обрабатывать внешние .ts — «no loaders configured».
  transpilePackages: ['@letar/glitchtip'],
}

export default withMDX(config)
