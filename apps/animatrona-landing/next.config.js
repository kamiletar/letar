// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/format-utils',
    '@letar/github-releases',
    '@letar/glitchtip',
    '@letar/ui',
  ],
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
