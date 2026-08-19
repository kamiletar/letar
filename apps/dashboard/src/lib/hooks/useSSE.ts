'use client'

import { useEventSource } from '@letar/hooks'
import { useState } from 'react'

interface UseSSEOptions {
  url: string
  eventName: string
  onError?: (error: Event) => void
  enabled?: boolean
  reconnectDelay?: number
}

export function useSSE<T>({ url, eventName, onError, enabled = true, reconnectDelay = 3000 }: UseSSEOptions) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { status, reconnect, disconnect } = useEventSource({
    url,
    enabled,
    minConnectIntervalMs: 1000,
    reconnect: { strategy: 'constant', baseDelayMs: reconnectDelay },
    events: {
      [eventName]: (event) => {
        try {
          setData(JSON.parse(event.data) as T)
        } catch {
          setError('Failed to parse data')
        }
      },
    },
    onOpen: () => setError(null),
    onError: (event) => {
      setError('Connection error')
      onError?.(event)
    },
  })

  return {
    data,
    isConnected: status === 'connected',
    error,
    disconnect,
    reconnect,
  }
}
