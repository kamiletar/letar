'use client'

import { useCallback, useEffect, useState } from 'react'

/** Ключ localStorage для режима высокого контраста */
const HIGH_CONTRAST_KEY = 'archetest-high-contrast'

/**
 * Режим высокого контраста (этап 5.4) — для использования на выставке/улице,
 * где экран планшета читается плохо при ярком свете.
 *
 * Ставит атрибут `data-contrast="high"` на `<html>`, который в теме усиливает
 * приглушённый текст и границы (см. `globalCss` в `theme/index.ts`).
 * Значение сохраняется в localStorage — переживает перезагрузку между посетителями.
 */
export function useHighContrast(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(false)

  // Гидратация из localStorage при монтировании — намеренно НЕ в useState(() => ...):
  // localStorage недоступен на сервере, инициализация в рендере дала бы разное
  // значение на сервере и при первом клиентском рендере (hydration mismatch),
  // см. .claude/docs/ssr-hydration-persisted-state.md
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIGH_CONTRAST_KEY) === '1'
      // oxlint-disable-next-line react/set-state-in-effect -- см. комментарий выше
      setEnabled(stored)
    } catch {
      /* localStorage недоступен — остаёмся в обычном режиме */
    }
  }, [])

  // Синхронизация атрибута на <html> и localStorage
  useEffect(() => {
    const root = document.documentElement
    if (enabled) {
      root.setAttribute('data-contrast', 'high')
    } else {
      root.removeAttribute('data-contrast')
    }
    try {
      localStorage.setItem(HIGH_CONTRAST_KEY, enabled ? '1' : '0')
    } catch {
      /* игнорируем недоступный localStorage */
    }
  }, [enabled])

  const toggle = useCallback(() => setEnabled((v) => !v), [])

  return { enabled, toggle }
}
