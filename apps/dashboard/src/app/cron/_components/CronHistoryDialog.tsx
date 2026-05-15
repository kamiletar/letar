'use client'

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { formatDateTime } from '@/lib/format'
import { Badge, Box, HStack, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { LuCheck, LuLoader, LuX } from 'react-icons/lu'

interface CronExecutionLog {
  id: string
  jobId: string
  startedAt: string
  completedAt: string | null
  status: 'success' | 'error' | 'running'
  statusCode: number | null
  responseBody: string | null
  error: string | null
  duration: number | null
}

interface HistoryResponse {
  success: boolean
  jobId: string
  jobName: string
  logs: CronExecutionLog[]
}

interface CronHistoryDialogProps {
  jobId: string | null
  serverId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function fetchHistory(jobId: string, serverId?: string | null): Promise<HistoryResponse> {
  const params = new URLSearchParams({ limit: '20' })
  if (serverId) {
    params.set('serverId', serverId)
  }
  const res = await fetch(`/api/cron/jobs/${jobId}/history?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Failed to fetch history')
  }
  return res.json()
}

function getStatusColor(status: 'success' | 'error' | 'running'): string {
  switch (status) {
    case 'success':
      return 'green'
    case 'error':
      return 'red'
    case 'running':
      return 'blue'
    default:
      return 'gray'
  }
}

function StatusIcon({ status }: { status: 'success' | 'error' | 'running' }) {
  switch (status) {
    case 'success':
      return <LuCheck />
    case 'error':
      return <LuX />
    case 'running':
      return <LuLoader className="animate-spin" />
    default:
      return null
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '-'
  }
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

export function CronHistoryDialog({ jobId, serverId, open, onOpenChange }: CronHistoryDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cron-history', jobId, serverId],

    queryFn: () => fetchHistory(jobId!, serverId),
    enabled: !!jobId && open,
  })

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>История выполнений: {data?.jobName || 'Загрузка...'}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody pb="6">
          {isLoading ? (
            <Box textAlign="center" py="8">
              <Spinner size="lg" />
            </Box>
          ) : error ? (
            <Text color="red.500">Ошибка загрузки истории</Text>
          ) : data?.logs.length === 0 ? (
            <Box textAlign="center" py="8">
              <Text color="fg.muted">Нет истории выполнений</Text>
            </Box>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Время</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Код</Table.ColumnHeader>
                  <Table.ColumnHeader>Длительность</Table.ColumnHeader>
                  <Table.ColumnHeader>Ошибка</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data?.logs.map((log) => (
                  <Table.Row key={log.id}>
                    <Table.Cell>
                      <VStack align="start" gap="0">
                        <Text fontSize="sm">{formatDateTime(log.startedAt)}</Text>
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={getStatusColor(log.status)} size="sm">
                        <HStack gap="1">
                          <StatusIcon status={log.status} />
                          <span>{log.status}</span>
                        </HStack>
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" fontFamily="mono">
                        {log.statusCode ?? '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatDuration(log.duration)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      {log.error && (
                        <Text fontSize="xs" color="red.500" maxW="300px" truncate title={log.error}>
                          {log.error}
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
