'use client'

import { useCallback, useEffect, useState } from 'react'

type SWStatus = 'idle' | 'registering' | 'registered' | 'error' | 'unsupported'

interface ServiceWorkerState {
  status: SWStatus
  registration: ServiceWorkerRegistration | null
  error: Error | null
  /** Доступно обновление SW — показать UI для перезагрузки */
  updateAvailable: boolean
  /** Ожидающий воркер (для вызова skipWaiting) */
  waitingWorker: ServiceWorker | null
}

export interface UseServiceWorkerOptions {
  /**
   * Путь к Service Worker файлу
   * @default '/sw.js'
   */
  swPath?: string
  /**
   * Scope для Service Worker
   * @default '/'
   */
  scope?: string
  /**
   * Отключить регистрацию SW программно
   * Полезно для условной регистрации (например, только для авторизованных)
   * @default false
   */
  disabled?: boolean
  /**
   * Callback при обнаружении обновления
   */
  onUpdateAvailable?: () => void
}

/**
 * Хук для регистрации и управления Service Worker
 *
 * @returns состояние SW и методы для взаимодействия
 *
 * @example
 * ```tsx
 * const { status, updateAvailable, applyUpdate } = useServiceWorker()
 *
 * // Показать уведомление об обновлении
 * if (updateAvailable) {
 *   return <button onClick={applyUpdate}>Обновить приложение</button>
 * }
 * ```
 */
export function useServiceWorker(options: UseServiceWorkerOptions = {}) {
  const { swPath = '/sw.js', scope = '/', disabled = false, onUpdateAvailable } = options

  const [state, setState] = useState<ServiceWorkerState>({
    status: 'idle',
    registration: null,
    error: null,
    updateAvailable: false,
    waitingWorker: null,
  })

  useEffect(() => {
    // Проверка программного отключения
    if (disabled) {
      setState((prev) => ({ ...prev, status: 'unsupported' }))
      return
    }

    // Проверка отключения через env (NEXT_PUBLIC_ переменные инлайнятся при сборке)
    if (process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === 'true') {
      // eslint-disable-next-line no-console
      console.log('[SW] Service Worker отключен (env)')
      setState((prev) => ({ ...prev, status: 'unsupported' }))
      return
    }

    // Проверка поддержки Service Worker
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, status: 'unsupported' }))
      return
    }

    // Обработка смены контроллера — перезагрузка страницы
    let refreshing = false
    const handleControllerChange = () => {
      if (refreshing) {
        return
      }
      refreshing = true
      // eslint-disable-next-line no-console
      console.log('[SW] Контроллер изменился, перезагрузка...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Обработчик для обнаружения ожидающего воркера
    const handleWaitingWorker = (worker: ServiceWorker) => {
      // eslint-disable-next-line no-console
      console.log('[SW] Доступно обновление')
      setState((prev) => ({
        ...prev,
        updateAvailable: true,
        waitingWorker: worker,
      }))
      onUpdateAvailable?.()
    }

    // Регистрация SW
    const registerSW = async () => {
      setState((prev) => ({ ...prev, status: 'registering' }))

      try {
        const registration = await navigator.serviceWorker.register(swPath, {
          scope,
        })

        // eslint-disable-next-line no-console
        console.log('[SW] Зарегистрирован:', registration.scope)

        // Проверить, есть ли уже ожидающий воркер
        if (registration.waiting) {
          handleWaitingWorker(registration.waiting)
        }

        // Обработка обновлений
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Новая версия установлена и готова
                handleWaitingWorker(newWorker)
              }
            })
          }
        })

        setState((prev) => ({
          ...prev,
          status: 'registered',
          registration,
          error: null,
        }))
      } catch (error) {
        console.error('[SW] Ошибка регистрации:', error)
        setState((prev) => ({
          ...prev,
          status: 'error',
          registration: null,
          error: error instanceof Error ? error : new Error('Ошибка регистрации SW'),
        }))
      }
    }

    registerSW()

    // Очистка
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [swPath, scope, disabled, onUpdateAvailable])

  /**
   * Применить обновление — активировать новый SW и перезагрузить страницу
   */
  const applyUpdate = useCallback(() => {
    const { waitingWorker } = state
    if (!waitingWorker) {
      console.warn('[SW] Нет ожидающего воркера для обновления')
      return
    }

    // eslint-disable-next-line no-console
    console.log('[SW] Применяем обновление...')

    // Отправляем сообщение SKIP_WAITING новому воркеру
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Страница перезагрузится автоматически через controllerchange event
  }, [state])

  /**
   * Отклонить обновление (скрыть уведомление)
   */
  const dismissUpdate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      updateAvailable: false,
    }))
  }, [])

  /**
   * Отправить сообщение активному Service Worker
   */
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage(message)
    }
  }, [])

  /**
   * Prefetch страниц для оффлайн доступа
   */
  const prefetchPages = useCallback(
    (urls: string[]) => {
      sendMessage({ type: 'PREFETCH', urls })
    },
    [sendMessage]
  )

  /**
   * Кэшировать расписание
   */
  const cacheSchedule = useCallback(
    (schedule: unknown) => {
      sendMessage({ type: 'CACHE_SCHEDULE', schedule })
    },
    [sendMessage]
  )

  /**
   * Кэшировать изображения
   */
  const cacheImages = useCallback(
    (urls: string[]) => {
      sendMessage({ type: 'CACHE_IMAGES', urls })
    },
    [sendMessage]
  )

  /**
   * Очистить весь кэш (для отладки)
   */
  const clearCache = useCallback(() => {
    sendMessage({ type: 'CLEAR_CACHE' })
  }, [sendMessage])

  return {
    ...state,
    applyUpdate,
    dismissUpdate,
    sendMessage,
    prefetchPages,
    cacheSchedule,
    cacheImages,
    clearCache,
  }
}
