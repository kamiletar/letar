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

export { FormI18nProvider, getLocalizedValue, useFormI18n } from './form-i18n-provider'
export type { TranslateFunction, TranslateParams } from './form-i18n-provider'

export { useLocalizedOptions } from './use-localized-options'
export type { LocalizableOption } from './use-localized-options'

export { SIZE_ORIGINS, STRING_FORMATS, ZOD_ERROR_CODES, createFormErrorMap } from './create-form-error-map'
export type { FormErrorMapConfig, ZodErrorCode } from './create-form-error-map'
