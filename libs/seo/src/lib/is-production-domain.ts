/**
 * Base URL currently resolved for the running process — `NEXT_PUBLIC_BASE_URL` when set,
 * otherwise the production URL passed in (so local dev without the env var still behaves like
 * production for anything reading the domain, e.g. building absolute links).
 */
export function getBaseUrl(productionUrl: string): string {
  return process.env.NEXT_PUBLIC_BASE_URL || productionUrl
}

/**
 * True only on the live production domain. `NODE_ENV` cannot answer this question — `next build`
 * sets `production` on staging images too, so any indexing/dev-backdoor gate keyed on `NODE_ENV`
 * treats staging as prod (see `.claude/rules/env-files.md`). The only reliable signal is the
 * actual resolved base URL against the known production URL.
 */
export function isProductionDomain(productionUrl: string): boolean {
  return getBaseUrl(productionUrl) === productionUrl
}
