/** Поддерживаемые провайдеры CAPTCHA */
export type CaptchaProvider = 'turnstile' | 'recaptcha' | 'hcaptcha'

/** Тема виджета CAPTCHA */
export type CaptchaTheme = 'auto' | 'light' | 'dark'

/** Размер виджета CAPTCHA */
export type CaptchaSize = 'normal' | 'compact' | 'invisible'

/** Конфигурация CAPTCHA на уровне createForm */
export interface CaptchaConfig {
  /** Провайдер CAPTCHA */
  provider: CaptchaProvider
  /** Публичный siteKey провайдера */
  siteKey: string
  /** Тема виджета (по умолчанию: 'auto') */
  theme?: CaptchaTheme
  /** Размер виджета (по умолчанию: 'normal') */
  size?: CaptchaSize
  /** Язык виджета (ISO 639-1, напр. 'ru') */
  language?: string
}

/** Пропсы компонента Form.Captcha */
export interface CaptchaFieldProps {
  /** Провайдер (переопределяет createForm) */
  provider?: CaptchaProvider
  /** Публичный siteKey (переопределяет createForm) */
  siteKey?: string
  /** Тема виджета */
  theme?: CaptchaTheme
  /** Размер виджета */
  size?: CaptchaSize
  /** Язык виджета */
  language?: string
  /** Callback при успешной верификации */
  onSuccess?: (token: string) => void
  /** Callback при ошибке верификации */
  onError?: (error: unknown) => void
  /** Callback при истечении токена */
  onExpire?: () => void
}

/** Результат серверной верификации */
export interface CaptchaVerifyResult {
  /** Успешна ли верификация */
  success: boolean
  /** Коды ошибок (если есть) */
  errorCodes?: string[]
  /** Hostname с которого пришёл запрос */
  hostname?: string
  /** Timestamp верификации */
  challengeTs?: string
}

/** Опции серверной верификации */
export interface CaptchaVerifyOptions {
  /** Провайдер CAPTCHA */
  provider: CaptchaProvider
  /** Секретный ключ провайдера (ТОЛЬКО на сервере!) */
  secretKey: string
  /** IP адрес пользователя (опционально, для reCAPTCHA) */
  remoteIp?: string
}

/** Имя скрытого поля для токена CAPTCHA */
export const CAPTCHA_TOKEN_FIELD = '__captchaToken' as const
