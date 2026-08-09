/**
 * i18n модуль для форм
 *
 * Предоставляет поддержку интернационализации для форм,
 * генерируемых через @letar/zenstack-form-plugin.
 *
 * @example
 * ```tsx
 * import { FormI18nProvider, useFormI18n, useLocalizedOptions } from '@letar/forms'
 * ```
 *
 * @example Автоматический перевод ошибок валидации
 * ```tsx
 * <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
 *   {children}
 * </FormI18nProvider>
 * ```
 */

// React-часть i18n переехала в `@letar/forms-react` (Фаза 7.3) — она нужна и Chakra-скину,
// и shadcn-скину одинаково. Словари и error map остались в `@letar/forms-core/i18n`.
export { FormI18nProvider, getLocalizedValue, useFormI18n, useLocalizedOptions } from '@letar/forms-react'
export type { LocalizableOption, TranslateFunction, TranslateParams } from '@letar/forms-react'

export { createFormErrorMap, SIZE_ORIGINS, STRING_FORMATS, ZOD_ERROR_CODES } from './create-form-error-map'
export type { FormErrorMapConfig, ZodErrorCode } from './create-form-error-map'
