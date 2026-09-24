'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

/** Ключ localStorage для режима высокого контраста */
const HIGH_CONTRAST_KEY = 'archetest-high-contrast'

/** Подписчики — все смонтированные переключатели (шапка десктопа и мобильное меню) */
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Источник истины — атрибут на `<html>`: его же читает тема */
function getSnapshot(): boolean {
  return document.documentElement.getAttribute('data-contrast') === 'high'
}

/** На сервере режим всегда выключен — первый клиентский рендер совпадает с SSR */
function getServerSnapshot(): boolean {
  return false
}

function applyHighContrast(enabled: boolean): void {
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
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Режим высокого контраста (этап 5.4) — для использования на выставке/улице,
 * где экран планшета читается плохо при ярком свете.
 *
 * Ставит атрибут `data-contrast="high"` на `<html>`, который в теме усиливает
 * приглушённый текст и границы (см. `globalCss` в `theme/index.ts`).
 * Значение сохраняется в localStorage — переживает перезагрузку между посетителями.
 *
 * Состояние общее для всех экземпляров: переключатель живёт и в шапке десктопа, и в
 * мобильном меню, оба смонтированы одновременно. С локальным `useState` на экземпляр
 * они расходились — включённый в меню режим шапка показывала выключенным.
 */
export function useHighContrast(): { enabled: boolean; toggle: () => void } {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Восстановление из localStorage после гидратации — не в рендере: на сервере localStorage
  // нет, и первый клиентский рендер обязан совпасть с SSR
  // (см. .claude/docs/ssr-hydration-persisted-state.md)
  useEffect(() => {
    try {
      if (localStorage.getItem(HIGH_CONTRAST_KEY) === '1' && !getSnapshot()) {
        applyHighContrast(true)
      }
    } catch {
      /* localStorage недоступен — остаёмся в обычном режиме */
    }
  }, [])

  const toggle = useCallback(() => applyHighContrast(!getSnapshot()), [])

  return { enabled, toggle }
}
