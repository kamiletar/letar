/**
 * SEO константы для aira-web
 */

import { getBaseUrl, isProductionDomain as sharedIsProductionDomain } from '@letar/seo'

const PRODUCTION_URL = 'https://aira.letar.best'

export const BASE_URL = getBaseUrl(PRODUCTION_URL)
export const SITE_NAME = 'Aira'
export const GITHUB_URL = 'https://github.com/kamiletar/aira'
export const GITHUB_REPO = 'kamiletar/aira'

/**
 * true только на боевом домене. `NODE_ENV` не годится для этой проверки — `next build`
 * выставляет `production` и на staging-образе тоже (см. .claude/rules/env-files.md).
 * Единственный общий источник правды для robots.ts.
 */
export function isProductionDomain(): boolean {
  return sharedIsProductionDomain(PRODUCTION_URL)
}
