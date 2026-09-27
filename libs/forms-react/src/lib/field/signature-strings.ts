'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов встроенных строк `Form.Field.Signature` (shadcn-скин) — режимы «Рисовать»/
 * «Ввести текст», подсказка над пустым canvas, подсказка текстового ввода typed-режима,
 * `aria-label` области подписи. Кнопка очистки сюда не входит — у неё уже есть общий ключ
 * `formSelection.clear` (`selection-strings.ts`), смысл тот же независимо от поля.
 *
 * ⚠️ Не тот же словарь, что `formField.signature.*` у Chakra-скина (`field-default-strings.ts`
 * в `libs/forms`) — общего рантайма между скинами для несписочных полей пока нет (тот словарь
 * локальный для Chakra, не заведён через `@letar/forms-react`). Ключи здесь намеренно с другим
 * префиксом (`formSignature.*`), чтобы одноимённый перевод приложения не значил разное в двух
 * пакетах; английские значения при этом совпадают с Chakra-версией (см. `BUILTIN_SIGNATURE_STRINGS`).
 */
export type SignatureStringKey =
  | 'formSignature.placeholder'
  | 'formSignature.drawTab'
  | 'formSignature.typedTab'
  | 'formSignature.typedPlaceholder'
  | 'formSignature.ariaLabel'

/** Английский текст — как у Chakra-версии поля, где для ключа есть аналог */
const BUILTIN_SIGNATURE_STRINGS: Record<SignatureStringKey, Record<string, string>> = {
  'formSignature.placeholder': { en: 'Sign here', ru: 'Подпишите здесь' },
  'formSignature.drawTab': { en: 'Draw', ru: 'Рисовать' },
  'formSignature.typedTab': { en: 'Type', ru: 'Ввести текст' },
  'formSignature.typedPlaceholder': { en: 'Type your name...', ru: 'Введите ваше имя...' },
  'formSignature.ariaLabel': { en: 'Signature pad', ru: 'Область подписи' },
}

function buildBuiltinString(key: SignatureStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_SIGNATURE_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит встроенную строку поля подписи — та же лестница `resolveStaticFormText`, что у
 * `resolveSelectionString`: перевод приложения по ключу → встроенный словарь по `locale` (ru/en)
 * → английский текст, если провайдера в дереве нет вовсе.
 */
export function resolveSignatureString(
  i18n: ReturnType<typeof useFormI18n>,
  key: SignatureStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveSignatureString`.
 *
 * ⚠️ Вызывать только из `useFieldState` поля, не из его `render`: `render` в `createField` — не
 * компонент, хуки там небезопасны (тот же приём, что у `useSelectionString`).
 */
export function useSignatureString(key: SignatureStringKey, noProviderLocale?: string): string {
  return resolveSignatureString(useFormI18n(), key, noProviderLocale)
}
