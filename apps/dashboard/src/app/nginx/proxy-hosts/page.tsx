'use client'

import { deleteProxyHostAction, toggleProxyHostAction } from '@/app/_actions/npm-actions'
import { Header } from '@/app/_components/layout/Header'
import { CreateProxyHostDialog } from '@/app/_components/nginx/CreateProxyHostDialog'
import { NginxNav } from '@/app/_components/nginx/NginxNav'
import { ProxyHostCard } from '@/app/_components/nginx/ProxyHostCard'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import type { NpmProxyHost } from '@/lib/npm'
import { Box, Button, Heading, HStack, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOptimistic, useTransition } from 'react'

interface AppInfo {
  name: string
  displayName: string
  port?: number
  domain?: string
  hasDocker: boolean
  containerName?: string
  type: 'web' | 'cli'
}

// Тип для оптимистичного обновления состояния
interface OptimisticAction {
  hostId: number
  type: 'toggle' | 'delete'
  enabled?: boolean
}

async function fetchProxyHosts(serverId: string | null) {
  const url = serverId ? `/api/nginx/proxy-hosts?serverId=${encodeURIComponent(serverId)}` : '/api/nginx/proxy-hosts'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch proxy hosts')
  }
  const data = await res.json()
  return { hosts: data.data as NpmProxyHost[], hasNpm: data.hasNpm !== false }
}

async function fetchNpmStatus(serverId: string | null) {
  const url = serverId ? `/api/nginx/status?serverId=${encodeURIComponent(serverId)}` : '/api/nginx/status'
  const res = await fetch(url)
  if (!res.ok) {
    return { status: 'error' as const, hasNpm: false }
  }
  return res.json()
}

async function fetchApps(serverId: string | null) {
  const url = serverId ? `/api/apps/list?serverId=${encodeURIComponent(serverId)}` : '/api/apps/list'
  const res = await fetch(url)
  if (!res.ok) {
    return []
  }
  const data = await res.json()
  return data.data as AppInfo[]
}

export default function ProxyHostsPage() {
  const { currentServer, isLoading: serverLoading } = useServerContext()
  const serverId = currentServer?.isLocal ? null : (currentServer?.id ?? null)

  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Статус подключения к NPM
  const { data: npmStatus } = useQuery({
    queryKey: ['npm-status', serverId],
    queryFn: () => fetchNpmStatus(serverId),
    refetchInterval: 30000,
    enabled: !serverLoading,
  })

  // Список приложений для создания proxy hosts
  const { data: apps = [] } = useQuery({
    queryKey: ['apps-list', serverId],
    queryFn: () => fetchApps(serverId),
    enabled: !serverLoading,
  })

  // Список proxy hosts
  const {
    data: proxyHostsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['npm-proxy-hosts', serverId],
    queryFn: () => fetchProxyHosts(serverId),
    refetchInterval: 30000,
    enabled: !serverLoading && npmStatus?.status === 'healthy',
  })

  const proxyHosts = proxyHostsData?.hosts
  const hasNpm = proxyHostsData?.hasNpm ?? npmStatus?.hasNpm ?? true

  // Оптимистичное состояние для proxy hosts
  const [optimisticHosts, setOptimisticState] = useOptimistic(
    proxyHosts ?? [],
    (state: NpmProxyHost[], action: OptimisticAction) => {
      if (action.type === 'toggle') {
        return state.map((host) => {
          if (host.id !== action.hostId) {
            return host
          }
          // NPM API может использовать как 0/1 так и true/false
          // Сохраняем в том же формате что был
          const newEnabled = typeof host.enabled === 'boolean' ? action.enabled : action.enabled ? 1 : 0
          return { ...host, enabled: newEnabled as number }
        })
      }
      if (action.type === 'delete') {
        return state.filter((host) => host.id !== action.hostId)
      }
      return state
    }
  )

  // Обработчик Toggle с useOptimistic
  const handleToggle = (hostId: number, enabled: boolean) => {
    startTransition(async () => {
      // Оптимистичное обновление
      setOptimisticState({ hostId, type: 'toggle', enabled })

      const result = await toggleProxyHostAction(hostId, enabled, serverId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })
        toaster.create({
          title: `Proxy host ${enabled ? 'enabled' : 'disabled'}`,
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })
        toaster.create({
          title: 'Failed to update proxy host',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Обработчик Delete
  const handleDelete = (hostId: number) => {
    startTransition(async () => {
      setOptimisticState({ hostId, type: 'delete' })

      const result = await deleteProxyHostAction(hostId, serverId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })
        toaster.create({
          title: 'Proxy host deleted',
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })
        toaster.create({
          title: 'Failed to delete proxy host',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Загрузка сервера
  if (serverLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Spinner size="xl" colorPalette="brand" />
            <Text mt="4" color="fg.muted">
              Загрузка...
            </Text>
          </Box>
        </Box>
      </>
    )
  }

  // NPM не настроен на сервере
  if (!hasNpm || npmStatus?.status === 'not_configured') {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Text color="fg.muted" fontSize="lg" fontWeight="medium" mb="2">
              NPM не настроен
            </Text>
            <Text color="fg.muted" mb="4">
              Nginx Proxy Manager не настроен для сервера {currentServer?.displayName ?? 'локального'}
            </Text>
          </Box>
        </Box>
      </>
    )
  }

  // Статус NPM не подключён
  if (npmStatus?.status === 'error') {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Text color="red.500" fontSize="lg" fontWeight="medium" mb="2">
              Nginx Proxy Manager недоступен
            </Text>
            <Text color="fg.muted" mb="4">
              {npmStatus.error || 'Проверьте подключение и настройки NPM'}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['npm-status', serverId] })}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Spinner size="xl" colorPalette="brand" />
            <Text mt="4" color="fg.muted">
              Loading proxy hosts...
            </Text>
          </Box>
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <NginxNav />
          <Box textAlign="center" py="12">
            <Text color="red.500">Failed to load proxy hosts</Text>
          </Box>
        </Box>
      </>
    )
  }

  // Используем оптимистичное состояние
  const displayHosts = optimisticHosts.length > 0 ? optimisticHosts : (proxyHosts ?? [])

  // Группируем по enabled (NPM API может возвращать 0/1 или true/false)
  const enabledHosts = displayHosts.filter((h) => h.enabled === 1 || h.enabled === true)
  const disabledHosts = displayHosts.filter((h) => h.enabled === 0 || h.enabled === false)

  const serverName = currentServer?.displayName ?? 'локальный сервер'

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <NginxNav />
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Proxy Hosts — {serverName}</Heading>
          <HStack>
            <CreateProxyHostDialog apps={apps} serverId={serverId} existingHosts={displayHosts} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })}
              disabled={isPending}
            >
              Refresh
            </Button>
          </HStack>
        </HStack>

        {/* Statistics */}
        <HStack gap={{ base: '4', md: '6' }} mb="6" fontSize="sm" flexWrap="wrap">
          <Box>
            <Text color="fg.muted">Total</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">
              {displayHosts.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Enabled</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="green.500">
              {enabledHosts.length}
            </Text>
          </Box>
          <Box>
            <Text color="fg.muted">Disabled</Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="gray.500">
              {disabledHosts.length}
            </Text>
          </Box>
        </HStack>

        {/* Enabled hosts */}
        {enabledHosts.length > 0 && (
          <Box mb="8">
            <Heading size="md" mb="4">
              Enabled Proxy Hosts
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap="6">
              {enabledHosts.map((host) => (
                <ProxyHostCard
                  key={host.id}
                  host={host}
                  onToggle={(enabled) => handleToggle(host.id, enabled)}
                  onDelete={() => handleDelete(host.id)}
                  isTransitioning={isPending}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Disabled hosts */}
        {disabledHosts.length > 0 && (
          <Box>
            <Heading size="md" mb="4">
              Disabled Proxy Hosts
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap="6">
              {disabledHosts.map((host) => (
                <ProxyHostCard
                  key={host.id}
                  host={host}
                  onToggle={(enabled) => handleToggle(host.id, enabled)}
                  onDelete={() => handleDelete(host.id)}
                  isTransitioning={isPending}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {displayHosts.length === 0 && (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">No proxy hosts found</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
