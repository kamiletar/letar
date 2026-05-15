import { composePlugins, withNx } from '@nx/next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Standalone output для Docker production
  output: 'standalone',
  // Стандарт монорепо
  trailingSlash: true,
  // Отключаем 308 редирект для POST (Better Auth)
  skipTrailingSlashRedirect: true,
  // Транспиляция workspace библиотек
  transpilePackages: ['@letar/analytics', '@letar/auth', '@letar/chakra-provider', '@letar/email', '@letar/forms', '@letar/ui'],
  nx: {},
}

const plugins = [withNx, withNextIntl]

export default composePlugins(...plugins)(nextConfig)
