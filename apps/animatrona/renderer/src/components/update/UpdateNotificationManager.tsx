/**
 * Менеджер уведомлений об обновлениях
 *
 * Отвечает за:
 * - Подписку на IPC события из main process
 * - Обновление Zustand store при получении событий
 * - Автоматический показ toast-уведомлений
 */

'use client'

import { useEffect } from 'react'
import { useUpdateStore } from './update-store'
import { useUpdateNotifications } from './use-update-notifications'

/**
 * Компонент-менеджер обновлений
 *
 * Должен быть размещён в корневом layout для работы во всём приложении
 *
 * @example
 * ```tsx
 * // В app/layout.tsx
 * <UpdateNotificationManager />
 * ```
 */
export function UpdateNotificationManager() {
  const setStatus = useUpdateStore((state) => state.setStatus)
  const setChangelog = useUpdateStore((state) => state.setChangelog)

  // Автоматические toast-уведомления
  useUpdateNotifications()

  useEffect(() => {
    if (!window.electronAPI?.updater) {
      return
    }

    // Подписка на события обновлений
    const unsubscribeStatus = window.electronAPI.updater.onStatusChange((status) => {
      setStatus(status)
    })

    const unsubscribeChangelog = window.electronAPI.updater.onChangelog((data) => {
      setChangelog(data.changelog)
    })

    // Получить начальный статус
    window.electronAPI.updater.getStatus().then((status) => {
      setStatus(status)
    })

    // Cleanup
    return () => {
      unsubscribeStatus()
      unsubscribeChangelog()
    }
  }, [setStatus, setChangelog])

  // Компонент не рендерит ничего видимого
  return null
}
