'use client'

import { createBackup, executeMigrations } from '@/app/_actions/database-actions'
import { Header } from '@/app/_components/layout/Header'
import { DatabaseCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatBytes } from '@/lib/format'
import { Badge, Box, Button, Card, Heading, HStack, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

interface DatabaseStatus {
  name: string
  containerStatus: {
    found: boolean
    running: boolean
    containerName: string
  }
  connectionOk: boolean
  host: string
  port: number
  database: string
}

interface DatabaseStats {
  name: string
  success: boolean
  stats?: {
    size: number
    connections: number
    tables: Array<{
      schemaname: string
      tablename: string
      size: number
      size_pretty: string
    }>
    version: string
  }
  error?: string
}

async function fetchDatabaseStatus(serverId: string | null) {
  const url = serverId ? `/api/database/status?serverId=${encodeURIComponent(serverId)}` : '/api/database/status'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch database status')
  }
  const data = await res.json()
  return data.databases as DatabaseStatus[]
}

async function fetchDatabaseStats(serverId: string | null) {
  const url = serverId ? `/api/database/stats?serverId=${encodeURIComponent(serverId)}` : '/api/database/stats'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch database stats')
  }
  const data = await res.json()
  return data.databases as DatabaseStats[]
}

export default function DatabasePage() {
  const { currentServer, isLoading: serverLoading } = useServerContext()
  const serverId = currentServer?.isLocal ? null : (currentServer?.id ?? null)
  const queryClient = useQueryClient()

  const {
    data: statuses,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['database-status', serverId],
    queryFn: () => fetchDatabaseStatus(serverId),
    refetchInterval: 10000,
    enabled: !serverLoading,
  })

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['database-stats', serverId],
    queryFn: () => fetchDatabaseStats(serverId),
    refetchInterval: 30000,
    enabled: !serverLoading,
  })

  const backupMutation = useMutation({
    mutationFn: async (dbName: string) => {
      const result = await createBackup(dbName, 'manual', serverId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create backup')
      }
      return result
    },
    onSuccess: (result) => {
      toaster.create({
        title: 'Backup created',
        description: 'message' in result ? (result as { message: string }).message : undefined,
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to create backup',
        description: error.message,
        type: 'error',
      })
    },
  })

  const migrationMutation = useMutation({
    mutationFn: async (appName: string) => {
      const result = await executeMigrations(appName, serverId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to run migrations')
      }
      return result
    },
    onSuccess: (result) => {
      toaster.create({
        title: 'Migrations completed',
        description: 'message' in result ? (result as { message: string }).message : undefined,
        type: 'success',
      })
      // Refresh stats after migration
      queryClient.invalidateQueries({ queryKey: ['database-stats', serverId] })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Migration failed',
        description: error.message,
        type: 'error',
      })
    },
  })

  // Загрузка сервера
  if (serverLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
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

  if (statusLoading || statsLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
            <Heading>Databases — {currentServer?.displayName ?? 'локальный сервер'}</Heading>
          </HStack>
          <SkeletonGrid count={2} columns={{ base: 1, md: 2, lg: 2 }} SkeletonComponent={DatabaseCardSkeleton} />
        </Box>
      </>
    )
  }

  if (statusError || statsError) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
            <Heading>Databases — {currentServer?.displayName ?? 'локальный сервер'}</Heading>
          </HStack>
          <Box textAlign="center" py="12">
            <Text color="red.500" mb="4">
              Failed to load database information
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['database-status', serverId] })
                queryClient.invalidateQueries({ queryKey: ['database-stats', serverId] })
              }}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </>
    )
  }

  const serverName = currentServer?.displayName ?? 'локальный сервер'

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Databases — {serverName}</Heading>
          <HStack flexWrap="wrap" gap="2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['database-status', serverId] })
                queryClient.invalidateQueries({ queryKey: ['database-stats', serverId] })
              }}
            >
              Refresh
            </Button>
            <Link href="/database/backups">
              <Button size="sm" colorPalette="brand">
                Manage Backups
              </Button>
            </Link>
          </HStack>
        </HStack>

        {/* Database Cards */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="6">
          {statuses?.map((status) => {
            const dbStats = stats?.find((s) => s.name === status.name)

            return (
              <Card.Root key={status.name}>
                <Card.Body>
                  <VStack align="start" gap="4">
                    {/* Header */}
                    <HStack justify="space-between" w="full">
                      <VStack align="start" gap="1">
                        <Text fontSize="lg" fontWeight="bold">
                          {status.name}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {status.database}
                        </Text>
                      </VStack>
                      <HStack>
                        <Badge colorPalette={status.containerStatus.running ? 'green' : 'red'} size="sm">
                          {status.containerStatus.running ? 'Running' : 'Stopped'}
                        </Badge>
                        {status.containerStatus.running && (
                          <Badge colorPalette={status.connectionOk ? 'green' : 'red'} size="sm">
                            {status.connectionOk ? 'Connected' : 'No Connection'}
                          </Badge>
                        )}
                      </HStack>
                    </HStack>

                    {/* Connection Info */}
                    <HStack fontSize="sm">
                      <Text color="fg.muted">Host:</Text>
                      <Text>
                        {status.host}:{status.port}
                      </Text>
                    </HStack>

                    {/* Stats */}
                    {dbStats?.success && dbStats.stats && (
                      <>
                        <HStack gap="6" fontSize="sm">
                          <VStack align="start" gap="0">
                            <Text color="fg.muted">Size</Text>
                            <Text fontWeight="medium">{formatBytes(dbStats.stats.size)}</Text>
                          </VStack>
                          <VStack align="start" gap="0">
                            <Text color="fg.muted">Connections</Text>
                            <Text fontWeight="medium">{dbStats.stats.connections}</Text>
                          </VStack>
                          <VStack align="start" gap="0">
                            <Text color="fg.muted">Tables</Text>
                            <Text fontWeight="medium">{dbStats.stats.tables.length}</Text>
                          </VStack>
                        </HStack>

                        {/* Top Tables */}
                        {dbStats.stats.tables.length > 0 && (
                          <Box w="full">
                            <Text fontSize="sm" fontWeight="medium" mb="2">
                              Largest Tables:
                            </Text>
                            <VStack align="start" gap="1" fontSize="xs">
                              {dbStats.stats.tables.slice(0, 5).map((table) => (
                                <HStack key={`${table.schemaname}.${table.tablename}`} justify="space-between" w="full">
                                  <Text>{table.tablename}</Text>
                                  <Text color="fg.muted">{table.size_pretty}</Text>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </>
                    )}

                    {/* Actions */}
                    <HStack w="full" mt="2" flexWrap="wrap" gap="2">
                      <Button
                        size="sm"
                        colorPalette="brand"
                        onClick={() => backupMutation.mutate(status.name)}
                        loading={backupMutation.isPending}
                        disabled={!status.containerStatus.running}
                      >
                        Create Backup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => migrationMutation.mutate(status.name)}
                        loading={migrationMutation.isPending}
                        disabled={!status.containerStatus.running}
                      >
                        Run Migrations
                      </Button>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            )
          })}
        </SimpleGrid>

        {statuses?.length === 0 && (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">Нет баз данных на этом сервере</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
