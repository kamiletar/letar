/** Адрес заявки студии на сайт; `from` помечает источник перехода (например, `kami`). */
export function getStudioOrderUrl(locale: string, from?: string) {
  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.letar.best').replace(/\/$/, '')
  const query = from ? `?topic=site&from=${encodeURIComponent(from)}` : '?topic=site'
  return `${studio}${locale === 'ru' ? '/zayavka/' : '/en/contact/'}${query}`
}

/** Одна структура публичного меню для главной, шапки, Drawer и подвала. */
export function getPublicNavigation(locale: string) {
  return [
    { key: 'contacts', href: '/contacts/' },
    { key: 'order', href: getStudioOrderUrl(locale) },
    { key: 'about', href: '/about/' },
    { key: 'blog', href: '/blog/' },
    { key: 'friends', href: '/#friends' },
  ] as const
}
