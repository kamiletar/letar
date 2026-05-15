'use client'

import { useMemo } from 'react'
import { useFormI18n } from './form-i18n-provider'

/**
 * Опция для select/radio/checkbox с поддержкой i18n
 */
export interface LocalizableOption {
  value: string | number
  label: string
  /** Опция отключена */
  disabled?: boolean
  /** Ключ i18n для перевода label (например, "RecipeType.SWEET") */
  i18nKey?: string
}

/**
 * Хук для локализации опций select/radio/checkbox
 *
 * Принимает массив опций с i18nKey и возвращает массив с переведёнными label.
 * Если i18n не настроен или перевод отсутствует, используется оригинальный label.
 *
 * @param options - Массив опций с возможными i18nKey
 * @returns Массив опций с переведёнными label
 *
 * @example
 * ```tsx
 * // Опции из Zod схемы
 * const rawOptions = [
 *   { value: 'SWEET', label: 'Сладкое', i18nKey: 'RecipeType.SWEET' },
 *   { value: 'SALTY', label: 'Солёное', i18nKey: 'RecipeType.SALTY' },
 * ]
 *
 * function MySelect() {
 *   const options = useLocalizedOptions(rawOptions)
 *   // options[0].label будет переведён если есть FormI18nProvider
 * }
 * ```
 */
export function useLocalizedOptions(
  options: LocalizableOption[] | undefined
): { value: string | number; label: string; disabled?: boolean }[] {
  const i18n = useFormI18n()

  return useMemo(() => {
    if (!options) {
      return []
    }

    if (!i18n) {
      // i18n не настроен — возвращаем оригинальные label
      return options.map(({ value, label, disabled }) => ({ value, label, disabled }))
    }

    return options.map(({ value, label, disabled, i18nKey }) => {
      if (!i18nKey) {
        return { value, label, disabled }
      }

      try {
        // Ключ для enum option: "EnumName.VALUE.label"
        const fullKey = `${i18nKey}.label`
        const translated = i18n.t(fullKey)

        // Если перевод пустой или равен ключу — используем fallback
        if (!translated || translated === fullKey) {
          return { value, label, disabled }
        }

        return { value, label: translated, disabled }
      } catch {
        return { value, label, disabled }
      }
    })
  }, [options, i18n])
}
