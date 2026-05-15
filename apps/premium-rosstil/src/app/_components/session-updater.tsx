'use client'

import { authClient } from '@/lib/auth-client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Компонент для автоматического обновления сессии при изменении данных профиля.
 *
 * Проблема:
 * - Better Auth использует cookie-based сессии с кэшированием
 * - Cookie не обновляется мгновенно после изменения данных в БД
 * - Header/меню показывают старое имя пользователя из устаревшего кэша
 *
 * Решение:
 * - Server actions добавляют ?updated=timestamp к URL после успешного обновления
 * - Этот компонент ловит параметр и вызывает refetch сессии
 * - Сессия обновляется с сервера
 * - Header/меню получают свежие данные
 */
export function SessionUpdater() {
  const searchParams = useSearchParams()
  const { refetch } = authClient.useSession()
  const lastUpdatedRef = useRef<string | null>(null)

  useEffect(() => {
    const updated = searchParams.get('updated')

    // Если есть параметр updated и он новый (не обработанный ранее)
    if (updated && updated !== lastUpdatedRef.current) {
      lastUpdatedRef.current = updated

      // Обновляем сессию с сервера
      refetch()
    }
  }, [searchParams, refetch])

  // Компонент не рендерит ничего
  return null
}
