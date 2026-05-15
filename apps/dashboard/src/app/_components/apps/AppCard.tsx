'use client'

import { formatBytes } from '@/lib/format'
import { Badge, Card, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

interface AppCardProps {
  name: string
  displayName: string
  type: 'web' | 'cli'
  port?: number
  status?: {
    running: boolean
    uptime?: number
  }
  stats?: {
    cpu: number
    memory: number
  }
  storage?: {
    total: number
  }
}

export function AppCard({ name, displayName, type, port, status, stats, storage }: AppCardProps) {
  const isRunning = status?.running || false

  // Форматирование uptime
  const formatUptime = (seconds?: number) => {
    if (!seconds) {
      return 'N/A'
    }
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}d ${hours}h`
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Link href={`/apps/${name}`} style={{ textDecoration: 'none' }}>
      <Card.Root _hover={{ borderColor: 'fg.default' }} transition="border-color 0.2s">
        <Card.Body gap="4">
          {/* Заголовок */}
          <HStack justify="space-between">
            <VStack align="start" gap="1">
              <Text fontSize="lg" fontWeight="bold">
                {displayName}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {name}
              </Text>
            </VStack>

            <Badge colorPalette={isRunning ? 'green' : 'gray'} size="sm" variant="solid">
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
          </HStack>

          {/* Метрики */}
          <HStack gap="6" fontSize="sm">
            {type === 'web' && port && (
              <VStack align="start" gap="0">
                <Text color="fg.muted">Port</Text>
                <Text fontWeight="medium">{port}</Text>
              </VStack>
            )}

            {status?.uptime !== undefined && (
              <VStack align="start" gap="0">
                <Text color="fg.muted">Uptime</Text>
                <Text fontWeight="medium">{formatUptime(status.uptime)}</Text>
              </VStack>
            )}

            {stats && (
              <>
                <VStack align="start" gap="0">
                  <Text color="fg.muted">CPU</Text>
                  <Text fontWeight="medium">{stats.cpu.toFixed(1)}%</Text>
                </VStack>

                <VStack align="start" gap="0">
                  <Text color="fg.muted">Memory</Text>
                  <Text fontWeight="medium">{stats.memory.toFixed(1)}%</Text>
                </VStack>
              </>
            )}

            {storage && (
              <VStack align="start" gap="0">
                <Text color="fg.muted">Storage</Text>
                <Text fontWeight="medium">{formatBytes(storage.total)}</Text>
              </VStack>
            )}
          </HStack>

          {/* Бейдж типа */}
          <HStack>
            <Badge colorPalette="blue" size="sm">
              {type === 'web' ? 'Web App' : 'CLI Tool'}
            </Badge>
          </HStack>
        </Card.Body>
      </Card.Root>
    </Link>
  )
}
