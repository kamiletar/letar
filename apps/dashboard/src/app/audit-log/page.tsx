'use client'

import { Header } from '@/app/_components/layout/Header'
import { toaster } from '@/app/_components/ui/toaster'
import { formatBytes, formatDateTime } from '@/lib/format'
import { Badge, Box, Button, Card, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

interface AuditLogEntry {
  timestamp: Date
  username: string
  role: string
  action: string
  resource?: string
  details?: Record<string, unknown>
  success: boolean
  error?: string
}

interface AuditLogResponse {
  success: boolean
  entries: AuditLogEntry[]
  totalCount: number
  fileSize: number
}

type AuditAction =
  | 'CONTAINER_START'
  | 'CONTAINER_STOP'
  | 'CONTAINER_RESTART'
  | 'CONTAINER_REMOVE'
  | 'IMAGE_REMOVE'
  | 'IMAGE_PRUNE'
  | 'DEPLOY_START'
  | 'DEPLOY_STOP'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'BACKUP_DELETE'
  | 'MIGRATION_EXECUTE'
  | 'LOGIN'
  | 'LOGOUT'

const ACTION_LABELS: Record<AuditAction, string> = {
  CONTAINER_START: 'Start Container',
  CONTAINER_STOP: 'Stop Container',
  CONTAINER_RESTART: 'Restart Container',
  CONTAINER_REMOVE: 'Remove Container',
  IMAGE_REMOVE: 'Remove Image',
  IMAGE_PRUNE: 'Prune Images',
  DEPLOY_START: 'Start Deploy',
  DEPLOY_STOP: 'Stop Deploy',
  BACKUP_CREATE: 'Create Backup',
  BACKUP_RESTORE: 'Restore Backup',
  BACKUP_DELETE: 'Delete Backup',
  MIGRATION_EXECUTE: 'Execute Migration',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
}

const ACTION_COLORS: Record<string, string> = {
  CONTAINER_START: 'green',
  CONTAINER_STOP: 'red',
  CONTAINER_RESTART: 'blue',
  CONTAINER_REMOVE: 'red',
  IMAGE_REMOVE: 'red',
  IMAGE_PRUNE: 'orange',
  DEPLOY_START: 'green',
  DEPLOY_STOP: 'red',
  BACKUP_CREATE: 'blue',
  BACKUP_RESTORE: 'orange',
  BACKUP_DELETE: 'red',
  MIGRATION_EXECUTE: 'purple',
  LOGIN: 'green',
  LOGOUT: 'gray',
}

async function fetchAuditLog(
  limit: number,
  offset: number,
  actionFilter?: string,
  usernameFilter?: string,
  successFilter?: string,
): Promise<AuditLogResponse> {
  const params = new URLSearchParams()
  params.set('limit', limit.toString())
  params.set('offset', offset.toString())
  if (actionFilter) {
    params.set('action', actionFilter)
  }
  if (usernameFilter) {
    params.set('username', usernameFilter)
  }
  if (successFilter) {
    params.set('success', successFilter)
  }

  const res = await fetch(`/api/audit-log?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Failed to fetch audit log')
  }
  return res.json()
}

async function clearAuditLog(): Promise<void> {
  const res = await fetch('/api/audit-log', { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('Failed to clear audit log')
  }
}

export default function AuditLogPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined)
  const [successFilter, setSuccessFilter] = useState<string | undefined>(undefined)
  const limit = 50

  const {
    data: auditLog,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-log', page, actionFilter, successFilter],
    queryFn: () => fetchAuditLog(limit, page * limit, actionFilter, undefined, successFilter),
    refetchInterval: 30000,
  })

  const clearMutation = useMutation({
    mutationFn: clearAuditLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toaster.create({
        title: 'Audit log cleared',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      toaster.create({
        title: 'Failed to clear audit log',
        description: error.message,
        type: 'error',
      })
    },
  })

  const getActionLabel = (action: string): string => {
    return ACTION_LABELS[action as AuditAction] || action
  }

  const getActionColor = (action: string): string => {
    return ACTION_COLORS[action] || 'gray'
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }} textAlign="center">
          <Spinner size="xl" colorPalette="brand" />
          <Text mt="4" color="fg.muted">
            Loading audit log...
          </Text>
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p={{ base: '4', md: '8' }}>
          <Text color="red.500">Failed to load audit log</Text>
        </Box>
      </>
    )
  }

  const totalPages = Math.ceil((auditLog?.totalCount || 0) / limit)

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <VStack align="start" gap="1">
            <Heading>Audit Log</Heading>
            <Text fontSize="sm" color="fg.muted">
              {auditLog?.totalCount || 0} entries • {formatBytes(auditLog?.fileSize || 0)}
            </Text>
          </VStack>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['audit-log'] })}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={() => clearMutation.mutate()}
              loading={clearMutation.isPending}
            >
              Clear Log
            </Button>
          </HStack>
        </HStack>

        {/* Filters */}
        <Box mb="6">
          <HStack gap="4" flexWrap="wrap">
            {/* Action Filter */}
            <HStack gap="2" flexWrap="wrap">
              <Text fontSize="sm" color="fg.muted">
                Action:
              </Text>
              <Button
                size="xs"
                variant={!actionFilter ? 'solid' : 'outline'}
                colorPalette={!actionFilter ? 'fg' : undefined}
                onClick={() => setActionFilter(undefined)}
              >
                All
              </Button>
              {['CONTAINER_START', 'CONTAINER_STOP', 'DEPLOY_START', 'BACKUP_CREATE', 'LOGIN'].map((action) => (
                <Button
                  key={action}
                  size="xs"
                  variant={actionFilter === action ? 'solid' : 'outline'}
                  colorPalette={actionFilter === action ? getActionColor(action) : undefined}
                  onClick={() => setActionFilter(action)}
                >
                  {getActionLabel(action)}
                </Button>
              ))}
            </HStack>

            {/* Success Filter */}
            <HStack gap="2">
              <Text fontSize="sm" color="fg.muted">
                Status:
              </Text>
              <Button
                size="xs"
                variant={!successFilter ? 'solid' : 'outline'}
                colorPalette={!successFilter ? 'fg' : undefined}
                onClick={() => setSuccessFilter(undefined)}
              >
                All
              </Button>
              <Button
                size="xs"
                variant={successFilter === 'true' ? 'solid' : 'outline'}
                colorPalette={successFilter === 'true' ? 'green' : undefined}
                onClick={() => setSuccessFilter('true')}
              >
                Success
              </Button>
              <Button
                size="xs"
                variant={successFilter === 'false' ? 'solid' : 'outline'}
                colorPalette={successFilter === 'false' ? 'red' : undefined}
                onClick={() => setSuccessFilter('false')}
              >
                Failed
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Entries */}
        {auditLog?.entries && auditLog.entries.length > 0
          ? (
            <VStack gap="3" align="stretch">
              {auditLog.entries.map((entry, index) => (
                <Card.Root key={`${entry.timestamp}-${index}`}>
                  <Card.Body py="3">
                    <HStack justify="space-between" flexWrap="wrap" gap="2">
                      <HStack gap="3" flexWrap="wrap">
                        <Badge colorPalette={getActionColor(entry.action)} size="sm">
                          {getActionLabel(entry.action)}
                        </Badge>
                        <Badge colorPalette={entry.success ? 'green' : 'red'} size="sm" variant="outline">
                          {entry.success ? 'Success' : 'Failed'}
                        </Badge>
                        {entry.resource && (
                          <Text fontFamily="mono" fontSize="sm" color="fg.muted">
                            {entry.resource}
                          </Text>
                        )}
                      </HStack>
                      <HStack gap="3" fontSize="sm" color="fg.muted">
                        <HStack gap="1">
                          <Badge colorPalette={entry.role === 'ADMIN' ? 'red' : 'blue'} size="xs">
                            {entry.role}
                          </Badge>
                          <Text>{entry.username}</Text>
                        </HStack>
                        <Text>{formatDateTime(entry.timestamp)}</Text>
                      </HStack>
                    </HStack>

                    {entry.error && (
                      <Text fontSize="sm" color="red.400" mt="2">
                        Error: {entry.error}
                      </Text>
                    )}

                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <Box mt="2">
                        <Text fontSize="xs" color="fg.muted">
                          {Object.entries(entry.details)
                            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                            .join(' • ')}
                        </Text>
                      </Box>
                    )}
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          )
          : (
            <Card.Root>
              <Card.Body>
                <Text color="fg.muted" textAlign="center">
                  No audit log entries found
                </Text>
              </Card.Body>
            </Card.Root>
          )}

        {/* Pagination */}
        {totalPages > 1 && (
          <HStack justify="center" mt="6" gap="2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Text fontSize="sm" color="fg.muted">
              Page {page + 1} of {totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </HStack>
        )}
      </Box>
    </>
  )
}
