/**
 * JSON-LD структурированные данные для SEO (schema.org).
 * Реализует WebSite, Organization и SoftwareApplication схемы для Aira.
 *
 * Безопасно: JSON-LD генерируется только из контролируемых констант —
 * BASE_URL, SITE_NAME и пропсов из i18n messages. Пользовательский ввод
 * сюда не попадает, поэтому XSS невозможен.
 */

import { BASE_URL, GITHUB_URL, SITE_NAME } from '@/lib/seo'

interface JsonLdProps {
  locale: string
  description: string
}

/**
 * Schema.org разметка для главной страницы.
 * Включает WebSite, Organization и SoftwareApplication.
 *
 * JSON сериализуется с escapingом HTML-небезопасных символов
 * (`<`, `>`, `&`, U+2028, U+2029) через replace, чтобы безопасно
 * встраивать в `<script>` без dangerouslySetInnerHTML.
 */
export function HomeJsonLd({ locale, description }: JsonLdProps) {
  const localeUrl = locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        name: SITE_NAME,
        url: BASE_URL,
        description,
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: SITE_NAME,
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/icon-512.png`,
          width: 512,
          height: 512,
        },
        description,
        sameAs: [GITHUB_URL],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${BASE_URL}/#software`,
        name: SITE_NAME,
        description,
        url: localeUrl,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Linux, macOS, Windows, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        license: 'https://opensource.org/licenses/MIT',
        softwareVersion: '0.3.3',
        author: { '@id': `${BASE_URL}/#organization` },
        publisher: { '@id': `${BASE_URL}/#organization` },
        codeRepository: GITHUB_URL,
        programmingLanguage: 'Rust',
      },
    ],
  }

  // Безопасная сериализация JSON для инлайн `<script>`:
  // экранируем `<`, `>`, `&`, U+2028, U+2029 → \uXXXX
  const safeJson = JSON.stringify(graph)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return <script type="application/ld+json">{safeJson}</script>
}
