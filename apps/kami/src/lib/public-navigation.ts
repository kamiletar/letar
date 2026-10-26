/** Адрес заявки студии на сайт; `from` помечает источник перехода (например, `kami`). */
export function getStudioOrderUrl(locale: string, from?: string) {
  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.letar.best').replace(/\/$/, '')
  const query = from ? `?topic=site&from=${encodeURIComponent(from)}` : '?topic=site'
  return `${studio}${locale === 'ru' ? '/zayavka/' : '/en/contact/'}${query}`
}

/** Одна структура публичного меню для главной, шапки, Drawer и подвала; порядок — как в стартовом меню (KM-031). */
export function getPublicNavigation(_locale?: string) {
  return [
    { key: 'order', href: '/site/' },
    { key: 'about', href: '/about/' },
    { key: 'blog', href: '/blog/' },
    { key: 'contacts', href: '/contacts/' },
    { key: 'friends', href: '/#friends' },
  ] as const
}
