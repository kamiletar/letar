const { composePlugins, withNx } = require('@nx/next')
const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone',
  // @swc/helpers — трейсер (@vercel/nft) не докопировал пакет в .next/standalone при первом
  // полном ребилде (MODULE_NOT_FOUND на _interop_require_default.js, деплой 2026-08-19). Тот же
  // класс бага, что у aboi (nextjs-standalone-tracing.md). Глоб сужен до
  // node_modules/@swc/helpers/**/* внутри bun-директории пакета — широкий @swc+helpers*/**/*
  // матчит и вложенный node_modules/tslib (симлинк), Turbopack падает на нём при чтении
  // директории как файла.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/.bun/@swc+helpers*/node_modules/@swc/helpers/**/*'],
  },
  nx: {},
  turbopack: {},
  // Typecheck отдельно через nx typecheck:tsgo — Next.js не понимает TS project references
  // (см. tsconfig.json "references"), из-за чего собственный тайпчекер next build ложно валит
  // rootDir-проверку на любом path-mapped импорте из libs/ (e.g. @letar/analytics). Тот же
  // паттерн уже у 14 других приложений монорепо (grandslamcup, kami, aboi, driving-school...).
  typescript: {
    ignoreBuildErrors: true,
  },
}

const plugins = [withNx, withNextIntl]

module.exports = composePlugins(...plugins)(nextConfig)
