'use client'

import { useRouter } from 'next/navigation'
import { createContext, type ReactNode, useCallback, useContext } from 'react'
import './transition.css'

// Направление анимации перехода
export type TransitionDirection = 'top' | 'bottom' | 'left' | 'right' | null

interface TransitionContextValue {
  navigateWithTransition: (href: string, direction: TransitionDirection) => void
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

export function useTransition() {
  const context = useContext(TransitionContext)
  if (!context) {
    throw new Error('useTransition must be used within TransitionProvider')
  }
  return context
}

interface TransitionProviderProps {
  children: ReactNode
}

/**
 * Провайдер для анимаций переходов между страницами
 * Использует View Transitions API для слайда в направлении кнопки
 */
export function TransitionProvider({ children }: TransitionProviderProps) {
  const router = useRouter()

  const navigateWithTransition = useCallback(
    (href: string, direction: TransitionDirection) => {
      // Проверяем поддержку View Transitions API
      if (!document.startViewTransition || !direction) {
        router.push(href)
        return
      }

      // Устанавливаем data-атрибут для направления анимации
      document.documentElement.dataset.transitionDirection = direction

      // Запускаем View Transition
      document.startViewTransition(() => {
        router.push(href)
      })
    },
    [router]
  )

  return <TransitionContext.Provider value={{ navigateWithTransition }}>{children}</TransitionContext.Provider>
}
