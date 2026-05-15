'use client'

/**
 * React context для города — доступ к cityId/slug/name из client-компонентов.
 */

import { createContext, useContext } from 'react'

interface CityContextValue {
  cityId: string
  citySlug: string
  cityName: string
  telegramLink: string | null
}

export const CityContext = createContext<CityContextValue | null>(null)

/** Хук для доступа к текущему городу */
export function useCity(): CityContextValue {
  const ctx = useContext(CityContext)
  if (!ctx) {
    throw new Error('useCity() вызван вне CityProvider')
  }
  return ctx
}

export function CityProvider({ children, value }: { children: React.ReactNode; value: CityContextValue }) {
  return <CityContext value={value}>{children}</CityContext>
}
