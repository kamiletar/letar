import createMDX from '@next/mdx'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
  output: 'standalone',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/chakra-provider',
    '@letar/format-utils',
    '@letar/github-releases',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/i18n-proxy',
    '@letar/seo',
    '@letar/ui',
  ],
  // Typecheck отдельно через nx typecheck:tsgo — Next.js не понимает TS project references
  // (см. tsconfig.json "references"), из-за чего собственный тайпчекер next build ложно валит
  // rootDir-проверку на любом path-mapped импорте из libs/ (e.g. @letar/chakra-provider). Тот же
  // паттерн уже у 14 других приложений монорепо (grandslamcup, kami, aboi, driving-school, time...).
  typescript: {
    ignoreBuildErrors: true,
  },
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

export default withNextIntl(withMDX(nextConfig))
