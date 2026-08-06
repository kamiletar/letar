'use client'

import { createBackup, removeBackup, restoreBackup } from '@/app/_actions/database-actions'
import { Header } from '@/app/_components/layout/Header'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Card, Collapsible, Heading, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { LuChevronDown, LuChevronRight, LuDownload } from 'react-icons/lu'

/** Количество бэкапов, показываемых по умолчанию */
const DEFAULT_VISIBLE_COUNT = 5

interface Backup {
  id: string
  dbName: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
  /** Флаг для оптимистичного UI — бэкап в процессе создания */
  isCreating?: boolean
}

/**
 * Получает список доступных БД для выбранного сервера
 */
async function fetchAvailableDatabases(serverId: string | null): Promise<string[]> {
  try {
    const url = serverId
      ? `/api/database/available?serverId=${encodeURIComponent(serverId)}`
      : '/api/database/available'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      return data.databases || []
    }
  } catch {
    console.error('Failed to fetch available databases')
  }
  // Fallback — пустой список
  return []
}

async function fetchBackups(databases: string[], serverId: string | null) {
  if (databases.length === 0) {
    return []
  }

  // Получаем бэкапы для БД текущего сервера
  const responses = await Promise.all(
    databases.map((db) => {
      const url = serverId
        ? `/api/database/${db}/backups?serverId=${encodeURIComponent(serverId)}`
        : `/api/database/${db}/backups`
      return fetch(url)
    }),
  )

  const allBackups: Backup[] = []
  const seenIds = new Set<string>()

  for (const res of responses) {
    if (res.ok) {
      const data = await res.json()
      for (const backup of data.backups) {
        // Дедупликация по id (filename)
        if (!seenIds.has(backup.id)) {
          seenIds.add(backup.id)
          allBackups.push(backup)
        }
      }
    }
  }

  // Сортируем по дате
  allBackups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return allBackups
}

export default function BackupsPage() {
  const queryClient = useQueryClient()
  const [isCreating, startCreateTransition] = useTransition()
  // Состояние для раскрытых секций (показать все бэкапы)
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set())
  // Состояние для свёрнутых секций (collapsible)
  const [collapsedDbs, setCollapsedDbs] = useState<Set<string>>(new Set())

  // Получаем выбранный сервер из контекста
  const { currentServer, isLoading: serverLoading } = useServerContext()
  const serverId = currentServer?.isLocal ? null : (currentServer?.id ?? null)

  // Сначала получаем список доступных БД для выбранного сервера
  const { data: availableDatabases, isLoading: isLoadingDatabases } = useQuery({
    queryKey: ['available-databases', serverId],
    queryFn: () => fetchAvailableDatabases(serverId),
    staleTime: 60000, // Кэшируем на минуту
    enabled: !serverLoading,
  })

  const {
    data: backups,
    isLoading: isLoadingBackups,
    error,
  } = useQuery({
    queryKey: ['all-backups', serverId, availableDatabases],
    queryFn: () => fetchBackups(availableDatabases || [], serverId),
    enabled: !serverLoading && !!availableDatabases && availableDatabases.length > 0,
    refetchInterval: 30000,
  })

  const isLoading = serverLoading || isLoadingDatabases || isLoadingBackups

  // Оптимистичное состояние — добавление placeholder при создании бэкапа
  const [optimisticBackups, addOptimisticBackup] = useOptimistic(
    backups || [],
    (currentBackups: Backup[], newBackup: Backup) => [newBackup, ...currentBackups],
  )

  // Обработчик создания бэкапа с оптимистичным UI
  const handleCreateBackup = (dbName: string) => {
    // Создаём placeholder для оптимистичного отображения
    const placeholderBackup: Backup = {
      id: `creating-${dbName}-${Date.now()}`,
      dbName,
      filename: 'Creating backup...',
      path: '',
      size: 0,
      createdAt: new Date().toISOString(),
      type: 'manual',
      isCreating: true,
    }

    startCreateTransition(async () => {
      // Мгновенно показываем placeholder
      addOptimisticBackup(placeholderBackup)

      try {
        const result = await createBackup(dbName, 'manual', serverId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to create backup')
        }
        // Инвалидируем кэш для получения реальных данных
        queryClient.invalidateQueries({ queryKey: ['all-backups', serverId] })
        toaster.create({
          title: 'Backup created',
          description: 'message' in result ? (result as { message: string }).message : undefined,
          type: 'success',
        })
      } catch (err) {
        // При ошибке инвалидируем кэш — placeholder исчезнет
        queryClient.invalidateQueries({ queryKey: ['all-backups', serverId] })
        toaster.create({
          title: 'Failed to create backup',
          description: err instanceof Error ? err.message : 'Unknown error',
          type: 'error',
        })
      }
    })
  }

  const deleteMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const result = await removeBackup(backupId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete backup')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-backups'] })
      toaster.create({
        title: 'Backup deleted',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to delete backup',
        description: error.message,
        type: 'error',
      })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async ({ dbName, backupId }: { dbName: string; backupId: string }) => {
      const result = await restoreBackup(dbName, backupId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to restore backup')
      }
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-backups'] })
      toaster.create({
        title: 'Backup restored',
        description: 'message' in result ? (result as { message: string }).message : undefined,
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to restore backup',
        description: error.message,
        type: 'error',
      })
    },
  })

  if (isLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="xl" colorPalette="brand" />
        <Text mt="4" color="fg.muted">
          Loading backups...
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p="8">
        <Text color="red.500">Failed to load backups</Text>
      </Box>
    )
  }

  // Группируем бэкапы по БД (используем оптимистичные данные)
  const backupsByDb = optimisticBackups.reduce(
    (acc, backup) => {
      if (!acc[backup.dbName]) {
        acc[backup.dbName] = []
      }
      acc[backup.dbName].push(backup)
      return acc
    },
    {} as Record<string, Backup[]>,
  )

  // Подсчитываем статистику (исключаем placeholder'ы)
  const realBackups = optimisticBackups.filter((b) => !b.isCreating)
  const totalSize = realBackups.reduce((sum, b) => sum + b.size, 0)

  return (
    <>
      <Header />
      <Box p="8">
        <HStack justify="space-between" mb="6">
          <Heading>Database Backups — {currentServer?.displayName ?? 'локальный сервер'}</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['available-databases', serverId] })
                queryClient.invalidateQueries({ queryKey: ['all-backups', serverId] })
              }}
            >
              Refresh
            </Button>
            <Link href="/database">
              <Button size="sm" variant="outline">
                Back to Databases
              </Button>
            </Link>
          </HStack>
        </HStack>

        {/* Statistics */}
        <HStack gap="6" mb="6">
          <Card.Root>
            <Card.Body>
              <VStack align="start" gap="1">
                <Text color="fg.muted">Total Backups</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {realBackups.length}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <VStack align="start" gap="1">
                <Text color="fg.muted">Total Size</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatBytes(totalSize)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </HStack>

        {/* Create Backup Buttons */}
        <HStack mb="6" flexWrap="wrap" gap="2">
          {availableDatabases && availableDatabases.length > 0
            ? (
              availableDatabases.map((dbName) => (
                <Button
                  key={dbName}
                  colorPalette="brand"
                  onClick={() => handleCreateBackup(dbName)}
                  loading={isCreating}
                >
                  Create: {dbName}
                </Button>
              ))
            )
            : <Text color="fg.muted">Нет доступных баз данных на этом сервере</Text>}
        </HStack>

        {/* Backups by Database */}
        {Object.entries(backupsByDb).map(([dbName, dbBackups]) => {
          const isCollapsed = collapsedDbs.has(dbName)
          const isExpanded = expandedDbs.has(dbName)
          const visibleBackups = isExpanded ? dbBackups : dbBackups.slice(0, DEFAULT_VISIBLE_COUNT)
          const hiddenCount = dbBackups.length - DEFAULT_VISIBLE_COUNT
          const dbSize = dbBackups.filter((b) => !b.isCreating).reduce((sum, b) => sum + b.size, 0)

          return (
            <Card.Root key={dbName} mb="4">
              <Card.Header
                py="3"
                px="4"
                cursor="pointer"
                onClick={() => {
                  setCollapsedDbs((prev) => {
                    const next = new Set(prev)
                    if (next.has(dbName)) {
                      next.delete(dbName)
                    } else {
                      next.add(dbName)
                    }
                    return next
                  })
                }}
                _hover={{ bg: 'bg.muted' }}
                borderBottomWidth={isCollapsed ? '0' : '1px'}
              >
                <HStack justify="space-between">
                  <HStack gap="3">
                    {isCollapsed ? <LuChevronRight /> : <LuChevronDown />}
                    <Heading size="sm">{dbName}</Heading>
                    <Badge colorPalette="gray" size="sm">
                      {dbBackups.length} backups
                    </Badge>
                    <Text fontSize="sm" color="fg.muted">
                      {formatBytes(dbSize)}
                    </Text>
                  </HStack>
                </HStack>
              </Card.Header>

              <Collapsible.Root open={!isCollapsed}>
                <Collapsible.Content>
                  <Card.Body pt="0" px="0">
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader pl="4">Filename</Table.ColumnHeader>
                          <Table.ColumnHeader>Type</Table.ColumnHeader>
                          <Table.ColumnHeader>Size</Table.ColumnHeader>
                          <Table.ColumnHeader>Created</Table.ColumnHeader>
                          <Table.ColumnHeader pr="4">Actions</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {visibleBackups.map((backup) => (
                          <Table.Row
                            key={backup.id}
                            opacity={backup.isCreating ? 0.6 : 1}
                            bg={backup.isCreating ? 'bg.emphasized' : undefined}
                          >
                            <Table.Cell pl="4">
                              {backup.isCreating
                                ? (
                                  <HStack gap="2">
                                    <Spinner size="xs" />
                                    <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                                      Creating backup...
                                    </Text>
                                  </HStack>
                                )
                                : (
                                  <Text fontSize="xs" fontFamily="mono">
                                    {backup.filename}
                                  </Text>
                                )}
                            </Table.Cell>
                            <Table.Cell>
                              <Badge
                                colorPalette={backup.isCreating ? 'yellow' : backup.type === 'manual' ? 'blue' : 'gray'}
                                size="sm"
                              >
                                {backup.isCreating ? 'creating' : backup.type}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontSize="sm" color={backup.isCreating ? 'fg.muted' : undefined}>
                                {backup.isCreating ? '—' : formatBytes(backup.size)}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontSize="sm" color={backup.isCreating ? 'fg.muted' : undefined}>
                                {backup.isCreating ? 'In progress...' : formatDateTime(backup.createdAt)}
                              </Text>
                            </Table.Cell>
                            <Table.Cell pr="4">
                              {backup.isCreating
                                ? (
                                  <Text fontSize="xs" color="fg.muted">
                                    Please wait...
                                  </Text>
                                )
                                : (
                                  <HStack gap="2">
                                    <Button size="xs" variant="outline" colorPalette="fg" asChild>
                                      {/* oxlint-disable-next-line eslint-plugin-next/no-html-link-for-pages -- download attribute requires <a> tag */}
                                      <a
                                        href={`/api/database/${backup.dbName}/backups/${backup.id}/download`}
                                        download={backup.filename}
                                      >
                                        <LuDownload />
                                        Download
                                      </a>
                                    </Button>
                                    <Button
                                      size="xs"
                                      colorPalette="orange"
                                      onClick={() =>
                                        restoreMutation.mutate({
                                          dbName: backup.dbName,
                                          backupId: backup.id,
                                        })}
                                      loading={restoreMutation.isPending}
                                    >
                                      Restore
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      colorPalette="red"
                                      onClick={() => deleteMutation.mutate(backup.id)}
                                      loading={deleteMutation.isPending}
                                    >
                                      Delete
                                    </Button>
                                  </HStack>
                                )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>

                    {/* Кнопка "показать ещё" */}
                    {hiddenCount > 0 && (
                      <Box textAlign="center" py="3" borderTopWidth="1px">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedDbs((prev) => {
                              const next = new Set(prev)
                              if (next.has(dbName)) {
                                next.delete(dbName)
                              } else {
                                next.add(dbName)
                              }
                              return next
                            })
                          }}
                        >
                          {isExpanded ? 'Show less' : `Show ${hiddenCount} more backups`}
                        </Button>
                      </Box>
                    )}
                  </Card.Body>
                </Collapsible.Content>
              </Collapsible.Root>
            </Card.Root>
          )
        })}

        {optimisticBackups.length === 0 && (
          <Card.Root>
            <Card.Body>
              <Text color="fg.muted">No backups found</Text>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </>
  )
}
