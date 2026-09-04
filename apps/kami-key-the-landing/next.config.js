// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
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
