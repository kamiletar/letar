/** Одна структура публичного меню для главной, шапки, Drawer и подвала. */
export function getPublicNavigation(locale: string) {
  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.letar.best').replace(/\/$/, '')
  return [
    { key: 'contacts', href: '/contacts/' },
    { key: 'order', href: `${studio}${locale === 'ru' ? '/zayavka/' : '/en/contact/'}?topic=site` },
    { key: 'about', href: '/about/' },
    { key: 'blog', href: '/blog/' },
    { key: 'friends', href: '/#friends' },
  ] as const
}
