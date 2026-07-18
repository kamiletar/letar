const { composePlugins, withNx } = require('@nx/next')
const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone',
  nx: {},
  turbopack: {},
  transpilePackages: ['@letar/analytics', '@letar/auth', '@letar/chakra-provider', '@letar/email'],
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
