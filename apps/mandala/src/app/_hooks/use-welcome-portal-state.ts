'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mandala-welcome-seen'

/** Мандала для навигации */
interface MandalaForNavigation {
  slug: string
}

interface UseWelcomePortalStateOptions {
  /** Список мандал для случайного выбора */
  mandalas: MandalaForNavigation[]
  /** Задержка перед показом портала в миллисекундах */
  showDelay?: number
}

interface UseWelcomePortalStateReturn {
  /** Видимость портала */
  isVisible: boolean
  /** Готов ли компонент (после проверки localStorage) */
  isReady: boolean
  /** Закрыть портал */
  handleClose: () => void
  /** Начать медитацию (переход к случайной мандале) */
  handleStartMeditation: () => void
  /** Обработчик клика по backdrop */
  handleBackdropClick: (e: React.MouseEvent) => void
}

/**
 * Хук для управления состоянием WelcomePortal.
 *
 * - Проверяет localStorage, видел ли пользователь портал
 * - Управляет видимостью с задержкой
 * - Предоставляет handlers для закрытия и навигации
 *
 * @example
 * const {
 *   isVisible,
 *   isReady,
 *   handleClose,
 *   handleStartMeditation,
 *   handleBackdropClick,
 * } = useWelcomePortalState({ mandalas })
 */
export function useWelcomePortalState({
  mandalas,
  showDelay = 500,
}: UseWelcomePortalStateOptions): UseWelcomePortalStateReturn {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Проверка localStorage и показ портала
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY)

    if (!hasSeenWelcome) {
      // Показываем портал с задержкой
      const timer = setTimeout(() => {
        setIsVisible(true)
        setIsReady(true)
      }, showDelay)

      return () => {
        clearTimeout(timer)
      }
    }

    setIsReady(true)
    return undefined
  }, [showDelay])

  /**
   * Закрытие портала и сохранение в localStorage
   */
  const handleClose = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  /**
   * Переход к случайной мандале в fullscreen
   */
  const handleStartMeditation = useCallback(() => {
    if (mandalas.length === 0) {
      router.push('/mandalas')
      return
    }

    const randomMandala = mandalas[Math.floor(Math.random() * mandalas.length)]
    router.push(`/mandalas/${randomMandala.slug}?fullscreen=1`)
    handleClose()
  }, [mandalas, router, handleClose])

  /**
   * Клик вне портала — закрытие
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose],
  )

  return {
    isVisible,
    isReady,
    handleClose,
    handleStartMeditation,
    handleBackdropClick,
  }
}
