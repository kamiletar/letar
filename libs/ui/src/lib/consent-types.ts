/** Состояние cookie-согласий пользователя, хранится в localStorage */
export interface CookieConsentState {
  /** Функциональные cookie — всегда активны */
  necessary: true
  /** Аналитика (Я.Метрика, Umami) — opt-in */
  analytics: boolean
  /** Маркетинг (ретаргетинг) — opt-in */
  marketing: boolean
  /** Версия политики конфиденциальности */
  version: string
  /** ISO timestamp момента согласия */
  acceptedAt: string
}

/** Конфигурация namespace cookie-баннера для одного приложения */
export interface ConsentConfig {
  /** Ключ в localStorage: `{appKey}.consent.{version}` */
  storageKey: string
  /** CustomEvent для повторного открытия баннера из футера */
  openSettingsEvent: string
  /** CustomEvent с detail: CookieConsentState — для consent-aware аналитических компонентов */
  consentChangeEvent: string
  policyVersion: string
}

/**
 * Создаёт конфигурацию namespace cookie-согласий для приложения.
 * Изолирует ключи localStorage и имена событий между разными приложениями монорепо.
 */
export function createConsentConfig(appKey: string, policyVersion = 'v1'): ConsentConfig {
  return {
    storageKey: `${appKey}.consent.${policyVersion}`,
    openSettingsEvent: `${appKey}:open-cookie-settings`,
    consentChangeEvent: `${appKey}:consent-change`,
    policyVersion,
  }
}

/** Читает текущее состояние согласий из localStorage (только на клиенте) */
export function readConsentState(storageKey: string): CookieConsentState | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) { return null }
    return JSON.parse(raw) as CookieConsentState
  } catch {
    return null
  }
}
