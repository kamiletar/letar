'use client'

import { useEffect } from 'react'

/**
 * Компонент автозапуска мониторинга
 * Вызывает /api/monitoring/auto-start при монтировании
 */
export function MonitoringAutoStart() {
  useEffect(() => {
    // Запускаем мониторинг при загрузке приложения
    fetch('/api/monitoring/auto-start')
      .then((res) => res.json())
      .then((data) => {
        if (data.autoStartAttempted) {
          // eslint-disable-next-line no-console
          console.log('[Dashboard] Monitoring auto-start triggered')
        }
      })
      .catch((err) => {
        console.error('[Dashboard] Failed to auto-start monitoring:', err)
      })
  }, [])

  return null
}
