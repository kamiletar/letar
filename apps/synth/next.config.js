// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: ['@letar/analytics', '@letar/chakra-provider', '@letar/hooks', '@letar/seo', '@letar/ui'],
  // Standalone output для Docker production сборки
  output: 'standalone',
  trailingSlash: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
