/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./types`) по всей `libs/forms` не пришлось переписывать.
 */
export { CAPTCHA_TOKEN_FIELD } from '@letar/forms-core/captcha'
export type {
  CaptchaConfig,
  CaptchaFieldProps,
  CaptchaProvider,
  CaptchaSize,
  CaptchaTheme,
  CaptchaVerifyOptions,
  CaptchaVerifyResult,
} from '@letar/forms-core/captcha'
