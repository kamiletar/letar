'use client'

import { hasUserLoggedIn } from '@/app/_components/auth-flag-setter'
import { useServiceWorker } from '@/hooks'
import { useEffect, useState } from 'react'

/**
 * Компонент для инициализации Service Worker
 * Рендерится один раз в корне приложения и регистрирует SW
 *
 * SW регистрируется только для пользователей, которые когда-либо авторизовывались.
 * Это экономит ресурсы для случайных посетителей.
 *
 * Можно отключить через NEXT_PUBLIC_DISABLE_SERVICE_WORKER=true в .env.local
 */
export function ServiceWorkerInit() {
  // Проверяем флаг на клиенте после гидратации
  const [shouldEnable, setShouldEnable] = useState(false)

  useEffect(() => {
    setShouldEnable(hasUserLoggedIn())
  }, [])

  const { status, prefetchPages } = useServiceWorker({
    disabled: !shouldEnable,
  })

  // Prefetch основных страниц после регистрации SW
  useEffect(() => {
    if (status === 'registered') {
      // Предзагрузка основных роутов для оффлайн доступа
      prefetchPages([
        '/my-schedule',
        '/my-lessons',
        '/my-profile',
        '/lessons',
        '/schedule/settings',
        '/profile',
        '/students/invite',
      ])
    }
  }, [status, prefetchPages])

  // Этот компонент ничего не рендерит
  return null
}
