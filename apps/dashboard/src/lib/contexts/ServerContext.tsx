'use client'

/**
 * ServerContext
 * Контекст для управления выбранным сервером мониторинга
 *
 * Хранит:
 * - Текущий выбранный сервер
 * - Список всех серверов
 * - Методы для переключения
 *
 * Сохраняет выбор в localStorage для persistence
 */

import type { ServerInfo } from '@/lib/server-client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Расширенный тип с приложениями (возвращается из /api/servers)
export interface ServerInfoWithApps extends ServerInfo {
  apps?: Array<{
    id: string
    name: string
    displayName: string
    containerName: string | null
    port: number | null
    type: string
    imageName?: string | null
    lastDeployed?: string | null
  }>
}

interface ServerContextValue {
  /** Текущий выбранный сервер */
  currentServer: ServerInfoWithApps | null
  /** ID текущего выбранного сервера (null = локальный) */
  selectedServerId: string | null
  /** Все доступные серверы */
  servers: ServerInfoWithApps[]
  /** Загружаются ли серверы */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Выбрать сервер по ID */
  selectServer: (serverId: string) => void
  /** Обновить список серверов */
  refetch: () => Promise<void>
}

const ServerContext = createContext<ServerContextValue | null>(null)

const STORAGE_KEY = 'dashboard-selected-server'

interface ServerContextProviderProps {
  children: React.ReactNode
}

export function ServerContextProvider({ children }: ServerContextProviderProps) {
  const [servers, setServers] = useState<ServerInfoWithApps[]>([])
  const [currentServerId, setCurrentServerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка серверов из API
  const fetchServers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/servers')
      if (!response.ok) {
        throw new Error('Ошибка загрузки серверов')
      }

      const data: ServerInfoWithApps[] = await response.json()
      setServers(data)

      // Если нет выбранного сервера, выбираем первый активный или локальный
      if (!currentServerId && data.length > 0) {
        const savedId = localStorage.getItem(STORAGE_KEY)
        const savedServer = savedId ? data.find((s) => s.id === savedId) : null

        if (savedServer) {
          setCurrentServerId(savedServer.id)
        } else {
          // Приоритет: локальный > первый активный
          const localServer = data.find((s) => s.isLocal && s.isActive)
          const firstActive = data.find((s) => s.isActive)
          setCurrentServerId((localServer || firstActive || data[0]).id)
        }
      }
    } catch (err) {
      console.error('[ServerContext] Error fetching servers:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [currentServerId])

  // Загрузка при монтировании
  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  // Выбор сервера
  const selectServer = useCallback((serverId: string) => {
    setCurrentServerId(serverId)
    localStorage.setItem(STORAGE_KEY, serverId)
  }, [])

  // Текущий сервер
  const currentServer = useMemo(() => {
    return servers.find((s) => s.id === currentServerId) || null
  }, [servers, currentServerId])

  // selectedServerId — используется для API запросов
  // Локальный сервер (isLocal) не требует передачи ID
  const selectedServerId = useMemo(() => {
    if (!currentServer || currentServer.isLocal) {
      return null
    }
    return currentServer.id
  }, [currentServer])

  const value: ServerContextValue = useMemo(
    () => ({
      currentServer,
      selectedServerId,
      servers,
      isLoading,
      error,
      selectServer,
      refetch: fetchServers,
    }),
    [currentServer, selectedServerId, servers, isLoading, error, selectServer, fetchServers]
  )

  return <ServerContext value={value}>{children}</ServerContext>
}

/**
 * Хук для доступа к контексту серверов
 */
export function useServerContext(): ServerContextValue {
  const context = useContext(ServerContext)

  if (!context) {
    throw new Error('useServerContext must be used within ServerContextProvider')
  }

  return context
}

/**
 * Хук для получения текущего сервера (shorthand)
 */
export function useCurrentServer(): ServerInfoWithApps | null {
  const { currentServer } = useServerContext()
  return currentServer
}
