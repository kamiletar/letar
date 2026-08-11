import { i18n } from '@/lib/i18n'
import { source } from '@/lib/source'
import type { MetadataRoute } from 'next'

/**
 * Интерактивные демо компонентов — `/demo/<name>`, без локализации (`ChakraProvider` + `Form`
 * напрямую, без `[lang]`). Список статичен, как в form-example: страниц немного и они меняются
 * редко, `fs.readdirSync` в build-time добавил бы риск разъехаться с реальным роутингом молча.
 */
const DEMO_PATHS = [
  'analytics',
  'auto-fields',
  'basic',
  'calculated',
  'captcha',
  'comparison',
  'conditional',
  'credit-card',
  'date',
  'debug-values',
  'depends-on',
  'documents',
  'field-watchers',
  'fields-all',
  'form-templates',
  'groups',
  'i18n',
  'matrix-choice',
  'multi-step',
  'number',
  'offline',
  'readonly',
  'security',
  'select',
  'signature',
  'skeleton',
  'smart-autofill',
  'specialized',
  'string',
  'table-editor',
  'testing-utilities',
  'undo-redo',
  'url-prefill',
  'utility',
  'validation',
] as const

const PRODUCTION_URL = 'https://forms.letar.best'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // Главная страница на каждом языке, alternates.languages — чтобы EN/RU не конкурировали как дубли.
  const homeLanguages = Object.fromEntries(i18n.languages.map((lang) => [lang, `${PRODUCTION_URL}/${lang}`]))
  const homeEntries: MetadataRoute.Sitemap = i18n.languages.map((lang) => ({
    url: `${PRODUCTION_URL}/${lang}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: lang === i18n.defaultLanguage ? 1 : 0.9,
    alternates: { languages: homeLanguages },
  }))

  // Страницы документации приходят из Fumadocs source API, а не из статического списка путей.
  const docsByLanguage = source.getLanguages()
  const docsUrlByLangAndSlug = new Map(
    docsByLanguage.map(({ language, pages }) => [
      language,
      new Map(pages.map((page) => [page.slugs.join('/'), page.url])),
    ]),
  )

  const defaultLangPages = docsUrlByLangAndSlug.get(i18n.defaultLanguage) ?? new Map()
  const docsEntries: MetadataRoute.Sitemap = Array.from(defaultLangPages.keys()).map((slug) => {
    const languages = Object.fromEntries(
      i18n.languages
        .map((lang) => [lang, docsUrlByLangAndSlug.get(lang)?.get(slug)] as const)
        .filter((entry): entry is [(typeof i18n.languages)[number], string] => Boolean(entry[1]))
        .map(([lang, url]) => [lang, `${PRODUCTION_URL}${url}`]),
    )

    return {
      url: `${PRODUCTION_URL}${defaultLangPages.get(slug)}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages },
    }
  })

  const demoEntries: MetadataRoute.Sitemap = DEMO_PATHS.map((path) => ({
    url: `${PRODUCTION_URL}/demo/${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...homeEntries, ...docsEntries, ...demoEntries]
}
