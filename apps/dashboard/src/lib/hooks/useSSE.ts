'use client'
/* eslint-disable no-console -- SSE connection logging required for debugging */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSSEOptions {
  url: string
  eventName: string
  onError?: (error: Event) => void
  enabled?: boolean
  reconnectDelay?: number
}

export function useSSE<T>({ url, eventName, onError, enabled = true, reconnectDelay = 3000 }: UseSSEOptions) {
  const [data, setData] = useState<T | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Храним onError в ref чтобы избежать пересоздания connect при каждом рендере
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  // Защита от слишком частых подключений
  const lastConnectTimeRef = useRef<number>(0)
  const isConnectingRef = useRef(false)

  const connect = useCallback(() => {
    if (!enabled) {
      return
    }

    // Предотвращаем параллельные подключения
    if (isConnectingRef.current) {
      console.log('[SSE] Already connecting, skipping')
      return
    }

    // Защита от слишком частых подключений (минимум 1 секунда между попытками)
    const now = Date.now()
    const timeSinceLastConnect = now - lastConnectTimeRef.current
    if (timeSinceLastConnect < 1000) {
      console.log(`[SSE] Too frequent connection attempt (${timeSinceLastConnect}ms), skipping`)
      return
    }
    lastConnectTimeRef.current = now
    isConnectingRef.current = true

    try {
      // Закрываем существующее соединение
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('open', () => {
        console.log(`[SSE] Connected to ${url}`)
        isConnectingRef.current = false
        setIsConnected(true)
        setError(null)
      })

      eventSource.addEventListener(eventName, (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data) as T
          setData(parsedData)
        } catch (err) {
          console.error('[SSE] Error parsing data:', err)
          setError('Failed to parse data')
        }
      })

      eventSource.addEventListener('error', (event) => {
        console.error('[SSE] Error:', event)
        isConnectingRef.current = false
        setIsConnected(false)
        setError('Connection error')

        if (onErrorRef.current) {
          onErrorRef.current(event)
        }

        // Попытка переподключения
        eventSource.close()
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[SSE] Reconnecting to ${url}...`)
            connect()
          }, reconnectDelay)
        }
      })
    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err)
      isConnectingRef.current = false
      setError('Failed to connect')
    }
  }, [url, eventName, enabled, reconnectDelay])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        setIsConnected(false)
      }
    }
  }, [connect, enabled])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  return {
    data,
    isConnected,
    error,
    disconnect,
    reconnect: connect,
  }
}
