/** JSON-LD разметка Organization (schema.org) для SEO */
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Премиум РосСтиль',
    url: 'https://premium.rosstil.ru',
    logo: 'https://premium.rosstil.ru/icons/icon-512.png',
    description: 'Маркетплейс дизайнерской одежды от Елены Аксяновой',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Russian',
    },
    sameAs: [],
  }

  // Статические данные из кода — безопасно для JSON-LD, XSS невозможен
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
