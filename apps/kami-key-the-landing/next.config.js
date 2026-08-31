// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  transpilePackages: ['@letar/analytics', '@letar/glitchtip', '@letar/seo', '@letar/ui'],
  // Standalone output для Docker production сборки
  output: 'standalone',
  // Trailing slash для консистентных URL
  trailingSlash: true,
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
