import type { MetadataRoute } from 'next'

/**
 * Статические демо-страницы. `/products/[id]/edit` не входит — зависит от реальных ID,
 * не годится для статичной карты сайта.
 */
const PUBLIC_PATHS = [
  { path: '', priority: 1 },
  { path: '/contacts', priority: 0.6 },
  { path: '/contacts/new', priority: 0.6 },
  { path: '/products', priority: 0.6 },
  { path: '/products/new', priority: 0.6 },
  { path: '/examples/advanced-fields', priority: 0.5 },
  { path: '/examples/all-fields', priority: 0.5 },
  { path: '/examples/analytics', priority: 0.5 },
  { path: '/examples/async-validation', priority: 0.5 },
  { path: '/examples/auto-fields', priority: 0.5 },
  { path: '/examples/auto-fields-advanced', priority: 0.5 },
  { path: '/examples/autofill', priority: 0.5 },
  { path: '/examples/autosave', priority: 0.5 },
  { path: '/examples/basic', priority: 0.5 },
  { path: '/examples/calculated', priority: 0.5 },
  { path: '/examples/captcha', priority: 0.5 },
  { path: '/examples/comparison', priority: 0.5 },
  { path: '/examples/conditional', priority: 0.5 },
  { path: '/examples/constraints', priority: 0.5 },
  { path: '/examples/conversational', priority: 0.5 },
  { path: '/examples/credit-card', priority: 0.5 },
  { path: '/examples/data-grid', priority: 0.5 },
  { path: '/examples/debug-values', priority: 0.5 },
  { path: '/examples/depends-on', priority: 0.5 },
  { path: '/examples/documents', priority: 0.5 },
  { path: '/examples/groups', priority: 0.5 },
  { path: '/examples/i18n', priority: 0.5 },
  { path: '/examples/matrix-choice', priority: 0.5 },
  { path: '/examples/multi-step', priority: 0.5 },
  { path: '/examples/offline', priority: 0.5 },
  { path: '/examples/persistence', priority: 0.5 },
  { path: '/examples/readonly', priority: 0.5 },
  { path: '/examples/recipes', priority: 0.5 },
  { path: '/examples/security', priority: 0.5 },
  { path: '/examples/server-errors', priority: 0.5 },
  { path: '/examples/signature', priority: 0.5 },
  { path: '/examples/skeleton', priority: 0.5 },
  { path: '/examples/survey-fields', priority: 0.5 },
  { path: '/examples/table-editor', priority: 0.5 },
  { path: '/examples/templates', priority: 0.5 },
  { path: '/examples/testing-utilities', priority: 0.5 },
  { path: '/examples/theming', priority: 0.5 },
  { path: '/examples/undo-redo', priority: 0.5 },
  { path: '/examples/url-prefill', priority: 0.5 },
  { path: '/examples/utility', priority: 0.5 },
  { path: '/examples/validation', priority: 0.5 },
  { path: '/examples/watch', priority: 0.5 },
  { path: '/examples/zenstack', priority: 0.5 },
] as const

const PRODUCTION_URL = 'https://forms-example.letar.best'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: `${PRODUCTION_URL}${path || '/'}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority,
  }))
}
