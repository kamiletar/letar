'use client'

import { QueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * QueryErrorBoundary combines React Query's error reset boundary
 * with our custom ErrorBoundary for better error handling with queries
 *
 * Usage:
 * ```tsx
 * <QueryErrorBoundary>
 *   <YourComponent />
 * </QueryErrorBoundary>
 * ```
 */
export const QueryErrorBoundary = ({ children, fallback }: Props) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset: _reset }) => (
        <ErrorBoundary
          onError={(error) => {
            console.error('Query error:', error)
          }}
          fallback={fallback}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
