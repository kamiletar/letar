'use client'

import {
  resolveSelectionString,
  resolveSignatureString,
  type SignatureStringKey,
  useFormI18n,
} from '@letar/forms-react'
import { SHADCN_NO_PROVIDER_LOCALE } from './selection-strings'

/**
 * Встроенные строки `Form.Field.Signature` shadcn-скина — из словаря `formSignature.*`
 * (`@letar/forms-react`), кроме `clear`: та же кнопка очистки, что у Select/Combobox, берёт общий
 * ключ `formSelection.clear`.
 */
export interface SignatureStrings {
  /** Placeholder поверх пустого canvas в draw mode */
  placeholder: string
  /** Подпись вкладки рисования */
  drawTab: string
  /** Подпись вкладки ввода текста */
  typedTab: string
  /** Placeholder текстового инпута typed mode */
  typedPlaceholder: string
  /** `aria-label` области подписи (canvas) */
  ariaLabel: string
  /** Подпись кнопки очистки — общий ключ `formSelection.clear` */
  clear: string
}

/**
 * Все встроенные строки поля подписи одним вызовом (один `useFormI18n`). Тот же приём, что у
 * `useSelectionStrings`: перевод приложения по ключу → словарь по `locale` → русский без провайдера.
 * Вызывать из `useFieldState` поля, не из `render`: там хуки небезопасны.
 */
export function useSignatureStrings(): SignatureStrings {
  const i18n = useFormI18n()
  const t = (key: SignatureStringKey) => resolveSignatureString(i18n, key, SHADCN_NO_PROVIDER_LOCALE)
  return {
    placeholder: t('formSignature.placeholder'),
    drawTab: t('formSignature.drawTab'),
    typedTab: t('formSignature.typedTab'),
    typedPlaceholder: t('formSignature.typedPlaceholder'),
    ariaLabel: t('formSignature.ariaLabel'),
    clear: resolveSelectionString(i18n, 'formSelection.clear', SHADCN_NO_PROVIDER_LOCALE),
  }
}
