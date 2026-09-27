'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов встроенных строк `Form.Field.PasswordStrength` — требования к паролю, подписи
 * силы, `aria-label` кнопки-глаза. Placeholder сюда не входит — у него уже есть свой словарь
 * (`field-placeholder-strings.ts` + Chakra-аналог `formField.passwordStrength.placeholder` в
 * `libs/forms`).
 *
 * ⚠️ В отличие от `formSignature.*`/`formFieldPlaceholder.*`, эти строки нужны Chakra- и
 * shadcn-скину **одинаково** (не разное озвучание одного смысла, а буквально один и тот же текст) —
 * поэтому здесь один общий словарь на оба скина, не по одному на каждый. Английские значения — как
 * был Chakra-хардкод, русские — как был shadcn-хардкод до i18n.
 *
 * `showPassword`/`hidePassword` — динамический `aria-label` кнопки-глаза (переключается вместе с
 * видимостью пароля, как было у Chakra). `togglePasswordVisibility` — статичный вариант, который
 * использовал shadcn-скин до i18n (одна строка независимо от состояния видимости) — отдельный
 * ключ, чтобы перевод не менял поведение кнопки.
 */
export type PasswordStrengthStringKey =
  | 'formPasswordStrength.requirement.minLength8'
  | 'formPasswordStrength.requirement.uppercase'
  | 'formPasswordStrength.requirement.lowercase'
  | 'formPasswordStrength.requirement.number'
  | 'formPasswordStrength.requirement.special'
  | 'formPasswordStrength.strength.weak'
  | 'formPasswordStrength.strength.medium'
  | 'formPasswordStrength.strength.good'
  | 'formPasswordStrength.strength.strong'
  | 'formPasswordStrength.strengthLabel'
  | 'formPasswordStrength.showPassword'
  | 'formPasswordStrength.hidePassword'
  | 'formPasswordStrength.togglePasswordVisibility'

/** Requirement id — как `PasswordRequirement` у Chakra/shadcn-скина (тип там свой, не импортируем) */
export type PasswordRequirementId = 'minLength:8' | 'uppercase' | 'lowercase' | 'number' | 'special'

const BUILTIN_PASSWORD_STRENGTH_STRINGS: Record<PasswordStrengthStringKey, Record<string, string>> = {
  'formPasswordStrength.requirement.minLength8': { en: 'Minimum 8 characters', ru: 'Минимум 8 символов' },
  'formPasswordStrength.requirement.uppercase': {
    en: 'At least one uppercase letter',
    ru: 'Хотя бы одна заглавная буква',
  },
  'formPasswordStrength.requirement.lowercase': {
    en: 'At least one lowercase letter',
    ru: 'Хотя бы одна строчная буква',
  },
  'formPasswordStrength.requirement.number': { en: 'At least one digit', ru: 'Хотя бы одна цифра' },
  'formPasswordStrength.requirement.special': {
    en: 'At least one special character (!@#$%^&*)',
    ru: 'Хотя бы один спецсимвол (!@#$%^&*)',
  },
  'formPasswordStrength.strength.weak': { en: 'Weak', ru: 'Слабый' },
  'formPasswordStrength.strength.medium': { en: 'Medium', ru: 'Средний' },
  'formPasswordStrength.strength.good': { en: 'Good', ru: 'Хороший' },
  'formPasswordStrength.strength.strong': { en: 'Strong', ru: 'Сильный' },
  'formPasswordStrength.strengthLabel': { en: 'Strength', ru: 'Надёжность' },
  'formPasswordStrength.showPassword': { en: 'Show password', ru: 'Показать пароль' },
  'formPasswordStrength.hidePassword': { en: 'Hide password', ru: 'Скрыть пароль' },
  'formPasswordStrength.togglePasswordVisibility': { en: 'Show/hide password', ru: 'Показать/скрыть пароль' },
}

function buildBuiltinString(key: PasswordStrengthStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_PASSWORD_STRENGTH_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит встроенную строку поля силы пароля — та же лестница `resolveStaticFormText`, что у
 * `resolveSignatureString`/`resolveSelectionString`: перевод приложения по ключу → встроенный
 * словарь по `locale` (ru/en) → английский текст, если провайдера в дереве нет вовсе и скин не
 * передал свой `noProviderLocale`.
 */
export function resolvePasswordStrengthString(
  i18n: ReturnType<typeof useFormI18n>,
  key: PasswordStrengthStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolvePasswordStrengthString` для одного ключа.
 *
 * ⚠️ Вызывать только из `useFieldState` поля, не из его `render`-колбэка (тот же приём, что у
 * `useSignatureString`/`useSelectionString`).
 */
export function usePasswordStrengthString(key: PasswordStrengthStringKey, noProviderLocale?: string): string {
  return resolvePasswordStrengthString(useFormI18n(), key, noProviderLocale)
}

/** Все встроенные строки поля одним объектом — набор одинаков у Chakra- и shadcn-скина */
export interface PasswordStrengthStrings {
  requirementLabels: Record<PasswordRequirementId, string>
  strengthLabels: { weak: string; medium: string; good: string; strong: string }
  strengthCaption: string
  showPasswordLabel: string
  hidePasswordLabel: string
  togglePasswordVisibilityLabel: string
}

function buildPasswordStrengthStrings(
  i18n: ReturnType<typeof useFormI18n>,
  noProviderLocale?: string,
): PasswordStrengthStrings {
  const t = (key: PasswordStrengthStringKey) => resolvePasswordStrengthString(i18n, key, noProviderLocale)
  return {
    requirementLabels: {
      'minLength:8': t('formPasswordStrength.requirement.minLength8'),
      uppercase: t('formPasswordStrength.requirement.uppercase'),
      lowercase: t('formPasswordStrength.requirement.lowercase'),
      number: t('formPasswordStrength.requirement.number'),
      special: t('formPasswordStrength.requirement.special'),
    },
    strengthLabels: {
      weak: t('formPasswordStrength.strength.weak'),
      medium: t('formPasswordStrength.strength.medium'),
      good: t('formPasswordStrength.strength.good'),
      strong: t('formPasswordStrength.strength.strong'),
    },
    strengthCaption: t('formPasswordStrength.strengthLabel'),
    showPasswordLabel: t('formPasswordStrength.showPassword'),
    hidePasswordLabel: t('formPasswordStrength.hidePassword'),
    togglePasswordVisibilityLabel: t('formPasswordStrength.togglePasswordVisibility'),
  }
}

/**
 * Хук-обёртка, которая резолвит все строки поля одним вызовом (один `useFormI18n`) — Chakra- и
 * shadcn-версии `FieldPasswordStrength` собирают из неё требования, подписи силы пароля и
 * `aria-label` кнопки-глаза, каждая со своим `noProviderLocale`.
 *
 * ⚠️ Вызывать только из `useFieldState`, не из `render`-колбэка (тот же приём, что у
 * `useSelectionString`).
 */
export function usePasswordStrengthStrings(noProviderLocale?: string): PasswordStrengthStrings {
  return buildPasswordStrengthStrings(useFormI18n(), noProviderLocale)
}
