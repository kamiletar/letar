/** Место кнопки на `/site/`: уходит в `utm_content` и в событие Umami. */
export type StudioCtaPlace = 'hero' | 'final'

/**
 * Адрес страницы услуг студии с меткой источника: UTM и `from=kami`.
 * Цены на kami не показываем: прайс ведёт студия (KM-036). Код `?ref` добавляет клиентская кнопка.
 */
export function getStudioServicesUrl(locale: string, place: StudioCtaPlace) {
  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.letar.best').replace(/\/$/, '')
  const query = new URLSearchParams({
    utm_source: 'kami',
    utm_medium: 'referral',
    utm_campaign: 'site',
    utm_content: place,
    from: 'kami',
  })
  return `${studio}${locale === 'ru' ? '/uslugi/' : '/en/services/'}?${query.toString()}`
}

/** Одна структура публичного меню для главной, шапки, Drawer и подвала; порядок — как в стартовом меню (KM-031). */
export function getPublicNavigation(_locale?: string) {
  return [
    { key: 'order', href: '/site/' },
    { key: 'about', href: '/about/' },
    { key: 'blog', href: '/blog/' },
    { key: 'contacts', href: '/contacts/' },
    { key: 'friends', href: '/friends/' },
  ] as const
}
