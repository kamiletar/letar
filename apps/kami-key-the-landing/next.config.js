// @ts-check

const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Standalone output для Docker production сборки
  output: 'standalone',
  // Trailing slash для консистентных URL
  trailingSlash: true,
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // @letar/ui — cookie-баннер согласий (CookieBanner, CookieSettingsButton)
  transpilePackages: ['@letar/ui'],
}

module.exports = composePlugins(withNx)(nextConfig)
