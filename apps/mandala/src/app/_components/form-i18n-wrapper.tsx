'use client'

import { FormI18nProvider, type TranslateFunction } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { createFormTranslate } from './form-translate'

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

  // Адаптер next-intl translator к TranslateFunction (без MISSING_MESSAGE на ключах, которых нет в messages)
  const t: TranslateFunction = useMemo(() => createFormTranslate(nextIntlT), [nextIntlT])

  return (
    <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
      {children}
    </FormI18nProvider>
  )
}
