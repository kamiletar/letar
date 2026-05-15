import { getLocale } from 'next-intl/server'
import { redirect as nextRedirect } from 'next/navigation'

/**
 * Серверный редирект с автоматическим определением локали.
 * Используется в Server Components и Server Actions.
 *
 * @param path - Путь без префикса локали (например, '/admin/products')
 *
 * @example
 * // В Server Action или Server Component:
 * import { redirect } from '@/i18n/server-redirect'
 *
 * redirect('/admin/products') // Редирект на /ru/admin/products
 */
export async function redirect(path: string): Promise<never> {
  const locale = await getLocale()
  // Убедимся, что путь начинается с /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return nextRedirect(`/${locale}${normalizedPath}`)
}
