'use client'

/**
 * ServerProvider
 * Client-side обёртка для ServerContextProvider
 */

import { ServerContextProvider } from '@/lib/contexts/ServerContext'
import type { ReactNode } from 'react'

interface ServerProviderProps {
  children: ReactNode
}

export function ServerProvider({ children }: ServerProviderProps) {
  return <ServerContextProvider>{children}</ServerContextProvider>
}
