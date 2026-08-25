'use client'

import { FormI18nProvider } from '@letar/forms'
import { useLocale } from 'next-intl'
import type { PropsWithChildren } from 'react'

/**
 * Локаль подсказок валидации (`z.string().min/max` и т.п.) — следует текущей next-intl локали
 * приложения, а не хардкодит `ru`.
 */
export function FormI18nWrapper({ children }: PropsWithChildren) {
  const locale = useLocale()

  return <FormI18nProvider locale={locale}>{children}</FormI18nProvider>
}
