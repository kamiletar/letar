'use client'

import { useLocale } from 'next-intl'

/**
 * Хук для выбора текста в зависимости от текущей локали
 * Для клиентских компонентов
 *
 * @example
 * const title = useLocalizedText(post.title, post.titleEn)
 */
export function useLocalizedText(ru: string, en: string): string {
  const locale = useLocale()
  return locale === 'ru' ? ru : en
}
