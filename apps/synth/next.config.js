// @ts-check

const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Standalone output для Docker production сборки
  output: 'standalone',
  trailingSlash: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['@letar/ui', '@letar/analytics', '@letar/chakra-provider'],
}

module.exports = composePlugins(withNx)(nextConfig)
