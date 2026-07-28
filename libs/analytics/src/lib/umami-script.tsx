'use client'

import Script from 'next/script'

interface UmamiScriptProps {
  /** Переопределить URL скрипта */
  scriptUrl?: string
  /** Переопределить Website ID */
  websiteId?: string
  /**
   * Явное согласие пользователя на аналитические cookies (152-ФЗ).
   * undefined — загрузить сразу без проверки (обратная совместимость).
   * false — не загружать до получения согласия.
   * true — загрузить.
   */
  hasConsent?: boolean
}

/**
 * Компонент для подключения Umami аналитики.
 * Читает настройки из env переменных или принимает props.
 *
 * @example
 * // В layout.tsx
 * <UmamiScript />
 *
 * @example
 * // С явными параметрами
 * <UmamiScript
 *   scriptUrl="https://stats.letar.best/script.js"
 *   websiteId="abc-123"
 * />
 */
export function UmamiScript({ scriptUrl, websiteId, hasConsent }: UmamiScriptProps) {
  const url = scriptUrl ?? process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
  const id = websiteId ?? process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  if (!url || !id || hasConsent === false) {
    return null
  }

  return <Script async src={url} data-website-id={id} strategy="lazyOnload" />
}

export default UmamiScript
