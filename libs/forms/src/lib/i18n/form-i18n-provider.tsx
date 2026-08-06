'use client'

import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { z } from 'zod/v4'
import { createFormErrorMap } from './create-form-error-map'

/**
 * Параметры для интерполяции в сообщениях об ошибках
 * @example { minimum: 5, maximum: 100 }
 */
export type TranslateParams = Record<string, string | number | boolean | undefined>

/**
 * Функция перевода (совместима с next-intl useTranslations)
 * @param key - Ключ перевода в формате "ModelName.fieldName.property"
 * @param params - Опциональные параметры для интерполяции
 * @returns Переведённая строка или fallback
 */
export type TranslateFunction = (key: string, params?: TranslateParams) => string

/**
 * Контекст для i18n в формах
 */
interface FormI18nContextValue {
  /** Функция перевода */
  t: TranslateFunction
  /** Текущая локаль */
  locale: string
  /** Включен ли i18n */
  enabled: boolean
}

const FormI18nContext = createContext<FormI18nContextValue | null>(null)

/**
 * Props для FormI18nProvider
 */
interface FormI18nProviderProps {
  /**
   * Функция перевода из next-intl или другой i18n библиотеки.
   * Если не задана, переводы полей (title, placeholder) не применяются,
   * но locale используется для constraint hints.
   * @example useTranslations('formSchemas')
   */
  t?: TranslateFunction
  /** Текущая локаль (default: 'en') */
  locale: string
  children: ReactNode
  /**
   * Автоматически настроить глобальный Zod error map для i18n
   *
   * При включении, Zod ошибки будут переводиться через функцию t()
   * с ключами вида `validation.{code}.{origin?}`
   *
   * @example
   * ```json
   * {
   *   "validation": {
   *     "too_small": { "string": "Минимум {minimum} символов" },
   *     "invalid_string": { "email": "Некорректный email" }
   *   }
   * }
   * ```
   *
   * @default false
   */
  setupZodErrorMap?: boolean
}

/**
 * Провайдер i18n для форм
 *
 * Оборачивает формы и предоставляет доступ к переводам через useFormI18n.
 * При наличии провайдера, компоненты форм будут использовать переводы
 * по ключам из i18nKey в схемах.
 *
 * @example Базовое использование
 * ```tsx
 * import { FormI18nProvider } from '@letar/forms'
 * import { useTranslations, useLocale } from 'next-intl'
 *
 * function App({ children }) {
 *   const t = useTranslations('formSchemas')
 *   const locale = useLocale()
 *
 *   return (
 *     <FormI18nProvider t={t} locale={locale}>
 *       {children}
 *     </FormI18nProvider>
 *   )
 * }
 * ```
 *
 * @example С автоматической настройкой Zod error map
 * ```tsx
 * <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
 *   {children}
 * </FormI18nProvider>
 * ```
 */
export function FormI18nProvider({ t, locale, children, setupZodErrorMap = false }: FormI18nProviderProps) {
  // Fallback t-функция: возвращает ключ как есть (без перевода)
  const resolvedT: TranslateFunction = t ?? ((key: string) => key)

  // Настраиваем глобальный Zod error map при включённом флаге
  useEffect(() => {
    if (setupZodErrorMap && t) {
      const errorMap = createFormErrorMap({ t })
      // Type assertion: наш error map совместим с Zod v4 API,
      // но TypeScript не может вывести это автоматически
      z.config({ customError: errorMap as z.core.$ZodErrorMap<z.core.$ZodIssue> })
    }
  }, [setupZodErrorMap, t])

  return <FormI18nContext.Provider value={{ t: resolvedT, locale, enabled: !!t }}>{children}</FormI18nContext.Provider>
}

/**
 * Хук для доступа к i18n в формах
 *
 * Возвращает функцию перевода и информацию о локали.
 * Если FormI18nProvider не найден, возвращает null.
 *
 * @example
 * ```tsx
 * function MyField() {
 *   const i18n = useFormI18n()
 *
 *   if (i18n) {
 *     const label = i18n.t('Product.name.title')
 *   }
 * }
 * ```
 */
export function useFormI18n(): FormI18nContextValue | null {
  return useContext(FormI18nContext)
}

/**
 * Получить переведённое значение с fallback
 *
 * Пытается получить перевод по ключу. Если перевод пустой или
 * i18n не настроен, возвращает fallback значение.
 *
 * @param i18n - Контекст i18n (может быть null)
 * @param i18nKey - Базовый ключ (например, "Product.name")
 * @param property - Свойство (например, "title", "placeholder")
 * @param fallback - Значение по умолчанию
 * @returns Переведённая строка или fallback
 */
export function getLocalizedValue(
  i18n: FormI18nContextValue | null,
  i18nKey: string | undefined,
  property: 'title' | 'placeholder' | 'description' | 'label',
  fallback: string | undefined,
): string | undefined {
  if (!i18n || !i18nKey) {
    return fallback
  }

  try {
    const fullKey = `${i18nKey}.${property}`
    const translated = i18n.t(fullKey)

    // Если перевод пустой или равен ключу (next-intl возвращает ключ при отсутствии перевода)
    if (!translated || translated === fullKey) {
      return fallback
    }

    return translated
  } catch {
    // При ошибке возвращаем fallback
    return fallback
  }
}
