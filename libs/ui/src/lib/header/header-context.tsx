'use client'

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

interface HeaderMobileContextValue {
  /** Открыто ли мобильное меню */
  isOpen: boolean
  /** Открыть мобильное меню */
  open: () => void
  /** Закрыть мобильное меню */
  close: () => void
  /** Переключить мобильное меню */
  toggle: () => void
}

const HeaderMobileContext = createContext<HeaderMobileContextValue | null>(null)

export interface HeaderMobileProviderProps {
  children: ReactNode
}

/**
 * Провайдер состояния мобильного меню
 */
export function HeaderMobileProvider({ children }: HeaderMobileProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return <HeaderMobileContext.Provider value={{ isOpen, open, close, toggle }}>{children}</HeaderMobileContext.Provider>
}

/**
 * Хук для управления мобильным меню
 */
export function useHeaderMobile(): HeaderMobileContextValue {
  const context = useContext(HeaderMobileContext)
  if (!context) {
    throw new Error('useHeaderMobile must be used within HeaderMobileProvider')
  }
  return context
}
