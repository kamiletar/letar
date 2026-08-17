export interface BreadcrumbJsonLdItem {
  name: string
  path: string
}

/**
 * BreadcrumbList JSON-LD (Schema.org) для навигации поисковиков.
 * `baseUrl` передаётся параметром — приложение резолвит его через `getBaseUrl()`.
 */
export function breadcrumbJsonLd(baseUrl: string, items: BreadcrumbJsonLdItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  }
}

export interface OrganizationJsonLdParams {
  name: string
  url: string
  description?: string
  /** Юридическое наименование — отличается от `name` (бренда), если у бизнеса есть ИП/ООО. */
  legalName?: string
  email?: string
  telephone?: string
  /** Ссылки на профили в соцсетях/маркетплейсах — Schema.org `sameAs`. */
  sameAs?: string[]
  /** Абсолютный URL логотипа. */
  logo?: string
}

/**
 * Organization JSON-LD (Schema.org) для главной страницы приложения.
 * Все поля параметризованы — либа не хранит бренд конкретного коммерса.
 */
export function organizationJsonLd(params: OrganizationJsonLdParams): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: params.name,
    url: params.url,
    description: params.description,
    legalName: params.legalName,
    email: params.email,
    telephone: params.telephone,
    sameAs: params.sameAs,
    logo: params.logo,
  }
}
