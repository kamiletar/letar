'use client'

import { AppControls } from '@/app/_components/apps/AppControls'
import { AppEnvVariables } from '@/app/_components/apps/AppEnvVariables'
import { AppResourceHistory } from '@/app/_components/apps/AppResourceHistory'
import { CleanUploadsButton } from '@/app/_components/apps/CleanUploadsButton'
import { StorageTrend } from '@/app/_components/apps/StorageTrend'
import { Header } from '@/app/_components/layout/Header'
import { formatBytes } from '@/lib/format'
import { Badge, Box, Card, Grid, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { use } from 'react'

interface AppStatus {
  exists: boolean
  running: boolean
  status?: string
  state?: string
  startedAt?: string
  uptime?: number
  ports?: Array<{ private: number; public: number; type: string }>
  image?: string
  containerId?: string
  containerName?: string
}

interface AppStats {
  cpu: { usage: number; cores: number }
  memory: { usage: number; limit: number; percentage: number }
  network?: { rx: number; tx: number }
  blockIO?: { read: number; write: number }
}

interface StorageStats {
  uploads: { size: number; files: number }
  nextStatic: { size: number; files: number }
  public: { size: number; files: number }
  total: number
  largestFiles: Array<{
    name: string
    size: number
    path: string
    modified: string
  }>
}

async function fetchAppStatus(appName: string) {
  const res = await fetch(`/api/apps/${appName}/status`)
  if (!res.ok) {
    throw new Error('Failed to fetch app status')
  }
  return (await res.json()) as AppStatus
}

async function fetchAppStats(appName: string) {
  const res = await fetch(`/api/apps/${appName}/stats`)
  if (!res.ok) {
    throw new Error('Failed to fetch app stats')
  }
  return (await res.json()) as AppStats
}

async function fetchAppStorage(appName: string) {
  const res = await fetch(`/api/apps/${appName}/storage`)
  if (!res.ok) {
    return null
  }
  return (await res.json()) as StorageStats
}

export default function AppDetailPage({ params: paramsPromise }: { params: Promise<{ app: string }> }) {
  const params = use(paramsPromise)
  const appName = params.app

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['app-status', appName],
    queryFn: () => fetchAppStatus(appName),
    refetchInterval: 5000,
  })

  const { data: stats } = useQuery({
    queryKey: ['app-stats', appName],
    queryFn: () => fetchAppStats(appName),
    refetchInterval: 5000,
    enabled: status?.running,
  })

  const { data: storage } = useQuery({
    queryKey: ['app-storage', appName],
    queryFn: () => fetchAppStorage(appName),
    refetchInterval: 30000,
  })

  const formatUptime = (seconds?: number) => {
    if (!seconds) {
      return 'N/A'
    }
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const parts = []
    if (days > 0) {
      parts.push(`${days}d`)
    }
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`)
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs}s`)
    }

    return parts.join(' ')
  }

  if (statusLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="xl" colorPalette="brand" />
        <Text mt="4" color="fg.muted">
          Loading application details...
        </Text>
      </Box>
    )
  }

  return (
    <>
      <Header />
      <Box p="8">
        {/* Header */}
        <VStack align="start" gap="4" mb="8">
          <HStack justify="space-between" w="full">
            <Heading>{appName}</Heading>
            <Badge colorPalette={status?.running ? 'green' : 'gray'} size="lg" variant="solid">
              {status?.running ? 'Running' : 'Stopped'}
            </Badge>
          </HStack>

          {status?.containerId && (
            <AppControls
              appName={appName}
              containerId={status.containerId}
              isRunning={status.running}
              onStatusChange={refetchStatus}
            />
          )}

          <HStack>
            <Link href={`/apps/${appName}/logs`}>
              <Badge colorPalette="blue" size="sm" cursor="pointer">
                View Logs →
              </Badge>
            </Link>
          </HStack>
        </VStack>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          {/* Container Info */}
          {status?.exists && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Container Info</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap="3">
                  <HStack justify="space-between">
                    <Text color="fg.muted">Container Name</Text>
                    <Text fontWeight="medium">{status.containerName}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">State</Text>
                    <Badge colorPalette={status.running ? 'green' : 'gray'} size="sm">
                      {status.state}
                    </Badge>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Status</Text>
                    <Text fontSize="sm">{status.status}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Uptime</Text>
                    <Text fontWeight="medium">{formatUptime(status.uptime)}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Image</Text>
                    <Text fontSize="sm">{status.image}</Text>
                  </HStack>

                  {status.ports && status.ports.length > 0 && (
                    <VStack align="stretch" gap="2">
                      <Text color="fg.muted">Ports</Text>
                      {status.ports.map((port, idx) => (
                        <Text key={idx} fontSize="sm">
                          {port.public}:{port.private} ({port.type})
                        </Text>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Resource Usage */}
          {stats && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Resource Usage</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap="3">
                  <HStack justify="space-between">
                    <Text color="fg.muted">CPU Usage</Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {stats.cpu.usage.toFixed(2)}%
                    </Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">CPU Cores</Text>
                    <Text fontWeight="medium">{stats.cpu.cores}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Memory Usage</Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {stats.memory.percentage.toFixed(2)}%
                    </Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Memory</Text>
                    <Text fontSize="sm">
                      {formatBytes(stats.memory.usage)} / {formatBytes(stats.memory.limit)}
                    </Text>
                  </HStack>

                  {stats.network && (
                    <>
                      <HStack justify="space-between">
                        <Text color="fg.muted">Network RX</Text>
                        <Text fontSize="sm">{formatBytes(stats.network.rx)}</Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="fg.muted">Network TX</Text>
                        <Text fontSize="sm">{formatBytes(stats.network.tx)}</Text>
                      </HStack>
                    </>
                  )}

                  {stats.blockIO && (
                    <>
                      <HStack justify="space-between">
                        <Text color="fg.muted">Disk Read</Text>
                        <Text fontSize="sm">{formatBytes(stats.blockIO.read)}</Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="fg.muted">Disk Write</Text>
                        <Text fontSize="sm">{formatBytes(stats.blockIO.write)}</Text>
                      </HStack>
                    </>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Storage Stats */}
          {storage && (
            <Card.Root>
              <Card.Header>
                <HStack justify="space-between">
                  <Heading size="md">Storage & Static Files</Heading>
                  <CleanUploadsButton appName={appName} daysOld={1} />
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap="3">
                  <HStack justify="space-between">
                    <Text color="fg.muted">Total Size</Text>
                    <Text fontWeight="medium" fontSize="lg">
                      {formatBytes(storage.total)}
                    </Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Uploads</Text>
                    <VStack align="end" gap="0">
                      <Text fontWeight="medium">{formatBytes(storage.uploads.size)}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {storage.uploads.files} files
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Next.js Static</Text>
                    <VStack align="end" gap="0">
                      <Text fontWeight="medium">{formatBytes(storage.nextStatic.size)}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {storage.nextStatic.files} files
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack justify="space-between">
                    <Text color="fg.muted">Public</Text>
                    <VStack align="end" gap="0">
                      <Text fontWeight="medium">{formatBytes(storage.public.size)}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {storage.public.files} files
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Storage Trend */}
          <StorageTrend appName={appName} days={30} />

          {/* Largest Files */}
          {storage?.largestFiles && storage.largestFiles.length > 0 && (
            <Card.Root>
              <Card.Header>
                <Heading size="md">Largest Files</Heading>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap="2">
                  {storage.largestFiles.map((file, idx) => (
                    <HStack key={idx} justify="space-between" fontSize="sm">
                      <Text lineClamp={1} flex="1" color="fg.muted">
                        {file.name}
                      </Text>
                      <Text fontWeight="medium">{formatBytes(file.size)}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </Grid>

        {/* Resource History Chart - Full Width */}
        {status?.running && (
          <Box mt="6">
            <AppResourceHistory appName={appName} hours={24} />
          </Box>
        )}

        {/* Environment Variables */}
        {status?.exists && (
          <Box mt="6">
            <AppEnvVariables appName={appName} />
          </Box>
        )}
      </Box>
    </>
  )
}
