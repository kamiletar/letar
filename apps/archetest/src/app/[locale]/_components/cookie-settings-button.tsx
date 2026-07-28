'use client'

import { CookieSettingsButton as UiCookieSettingsButton } from '@letar/ui'

/** Кнопка настроек cookie в шапке Archetest (в приложении нет отдельного футера) */
export function CookieSettingsButton() {
  return <UiCookieSettingsButton appKey="archetest" />
}
