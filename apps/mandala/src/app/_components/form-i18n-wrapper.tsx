'use client'

import { FormI18nProvider, type TranslateFunction, type TranslateParams } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback } from 'react'

interface FormI18nWrapperProps {
  children: React.ReactNode
}

/**
 * Обёртка для FormI18nProvider с интеграцией next-intl.
 * Автоматически настраивает Zod error map для перевода ошибок валидации.
 */
export function FormI18nWrapper({ children }: FormI18nWrapperProps) {
  const nextIntlT = useTranslations()
  const locale = useLocale()

  // Адаптер next-intl translator к TranslateFunction
  const t: TranslateFunction = useCallback(
    (key: string, params?: TranslateParams) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return nextIntlT(key as any, params as any)
      } catch {
        // Если ключ не найден, возвращаем сам ключ
        return key
      }
    },
    [nextIntlT]
  )

  return (
    <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
      {children}
    </FormI18nProvider>
  )
}
