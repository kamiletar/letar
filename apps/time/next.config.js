const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
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
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/email',
    '@letar/env-load',
    '@letar/glitchtip',
    '@letar/i18n-proxy',
    '@letar/number-words',
    '@letar/seo',
    '@letar/ui',
  ],
  turbopack: {},
  // Typecheck отдельно через nx typecheck:tsgo — Next.js не понимает TS project references
  // (см. tsconfig.json "references"), из-за чего собственный тайпчекер next build ложно валит
  // rootDir-проверку на любом path-mapped импорте из libs/ (e.g. @letar/analytics). Тот же
  // паттерн уже у 14 других приложений монорепо (grandslamcup, kami, aboi, driving-school...).
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = withNextIntl(nextConfig)
