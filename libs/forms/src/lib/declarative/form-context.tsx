'use client'

import { createContext, useContext } from 'react'
import type { DeclarativeFormContextValue } from './types'

/**
 * Context for declarative form API
 * Provides access to form instance and primitive array index
 */
export const DeclarativeFormContext = createContext<DeclarativeFormContextValue | null>(null)

/**
 * Hook to access declarative form context
 * @throws Error if used outside of Form component
 */
export function useDeclarativeForm(): DeclarativeFormContextValue {
  const context = useContext(DeclarativeFormContext)
  if (!context) {
    throw new Error('useDeclarativeForm must be used inside a Form component')
  }
  return context
}

/**
 * Hook to access declarative form context (nullable)
 * @returns Context or null if outside Form
 */
export function useDeclarativeFormOptional(): DeclarativeFormContextValue | null {
  return useContext(DeclarativeFormContext)
}
