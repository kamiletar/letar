'use client'

import {
  Badge,
  Box,
  Button,
  Collapsible,
  Heading,
  HStack,
  Icon,
  Progress,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { LuCircleCheck, LuSearch, LuTrash2, LuTriangleAlert } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { formatFileSize } from '@/lib/ipfs'

import type { PinServer } from './types'

/** Метки фаз для отображения */
const PHASE_LABELS: Record<string, string> = {
  collecting_cids: 'Сбор CIDs из библиотеки',
  fetching_pins: 'Загрузка списка пинов',
  comparing: 'Сравнение',
  unpinning: 'Распиновка сиротских',
  gc: 'Garbage Collection',
  updating_stats: 'Обновление статистики',
}

interface AuditStatusResponse {
  id: string
  serverId: string
  serverName: string
  status: 'running' | 'done' | 'error'
  phase: string
  progress: { current: number; total: number; detail: string }
  result: {
    referencedCidsCount: number
    pinnedCidsCount: number
    orphanedCount: number
    unpinnedCount: number
    errorCount: number
    freedBytes: number
    errors: string[]
    manifestErrors: string[]
  }
  errorMessage?: string
}

interface AuditPinsSectionProps {
  pinServers: PinServer[]
}

export function AuditPinsSection({ pinServers }: AuditPinsSectionProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)

  // Polling статуса активной задачи
  const { data: jobStatus } = useQuery<AuditStatusResponse>({
    queryKey: ['audit-pins-status', activeJobId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-pins/status?jobId=${activeJobId}`)
      if (!res.ok) {
        throw new Error('Не удалось получить статус')
      }
      return res.json()
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' ? 3000 : false
    },
  })

  const handleStartAudit = useCallback(async (serverId: string) => {
    setLaunching(serverId)
    try {
      const res = await fetch(`/api/admin/audit-pins/run?serverId=${serverId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }))
        if (data.jobId) {
          // Уже запущен — подключаемся к существующей задаче
          setActiveJobId(data.jobId)
        } else {
          toaster.error({ title: data.error || 'Ошибка запуска аудита' })
        }
        return
      }
      const { jobId } = await res.json()
      setActiveJobId(jobId)
      toaster.success({ title: 'Аудит запущен' })
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLaunching(null)
    }
  }, [])

  const progressPercent = jobStatus?.progress.total && jobStatus.progress.total > 0
    ? Math.round((jobStatus.progress.current / jobStatus.progress.total) * 100)
    : 0

  return (
    <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel">
      <HStack gap={2} mb={3}>
        <Icon as={LuSearch} />
        <Heading size="sm">Аудит сиротских пинов</Heading>
      </HStack>

      <Text fontSize="sm" color="fg.muted" mb={3}>
        Полный аудит: сбор всех CIDs из библиотеки (БД + IPFS манифесты), сравнение с пинами на сервере, unpin
        сиротских, GC и обновление статистики.
      </Text>

      {/* Кнопки запуска — по серверу */}
      {!activeJobId && (
        <HStack gap={2} flexWrap="wrap">
          {pinServers.map((server) => (
            <Button
              key={server.id}
              size="sm"
              variant="outline"
              colorPalette="orange"
              loading={launching === server.id}
              onClick={() => handleStartAudit(server.id)}
            >
              <Icon as={LuTrash2} mr={1} />
              {server.name}
            </Button>
          ))}
        </HStack>
      )}

      {/* Прогресс активной задачи */}
      {jobStatus && jobStatus.status === 'running' && (
        <VStack align="stretch" gap={2} mt={3}>
          <HStack gap={2}>
            <Badge colorPalette="blue" variant="subtle">
              {PHASE_LABELS[jobStatus.phase] || jobStatus.phase}
            </Badge>
            <Text fontSize="xs" color="fg.muted">
              {jobStatus.serverName}
            </Text>
          </HStack>

          <Progress.Root value={progressPercent} size="sm" colorPalette="blue">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <Text fontSize="xs" color="fg.muted">
            {jobStatus.progress.current}/{jobStatus.progress.total} — {jobStatus.progress.detail}
          </Text>
        </VStack>
      )}

      {/* Результат */}
      {jobStatus && jobStatus.status === 'done' && (
        <VStack align="stretch" gap={2} mt={3}>
          <HStack gap={2}>
            <Icon as={LuCircleCheck} color="green.500" />
            <Text fontWeight="medium">Аудит завершён — {jobStatus.serverName}</Text>
          </HStack>

          <HStack gap={4} flexWrap="wrap" fontSize="sm">
            <Text>
              Пинов: <strong>{jobStatus.result.pinnedCidsCount}</strong>
            </Text>
            <Text>
              Referenced: <strong>{jobStatus.result.referencedCidsCount}</strong>
            </Text>
            <Text>
              Сиротских: <strong>{jobStatus.result.orphanedCount}</strong>
            </Text>
            <Text>
              Распинено: <strong>{jobStatus.result.unpinnedCount}</strong>
            </Text>
            {jobStatus.result.errorCount > 0 && (
              <Text color="fg.error">
                Ошибок: <strong>{jobStatus.result.errorCount}</strong>
              </Text>
            )}
            {jobStatus.result.freedBytes > 0 && (
              <Text color="green.500">
                Освобождено: <strong>{formatFileSize(jobStatus.result.freedBytes)}</strong>
              </Text>
            )}
          </HStack>

          {/* Ошибки манифестов */}
          {jobStatus.result.manifestErrors.length > 0 && (
            <Collapsible.Root>
              <Collapsible.Trigger asChild>
                <Button size="xs" variant="ghost" colorPalette="orange">
                  <Icon as={LuTriangleAlert} mr={1} />
                  {jobStatus.result.manifestErrors.length} ошибок манифестов
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Box mt={1} p={2} bg="bg.subtle" borderRadius="md" maxH="200px" overflowY="auto" fontSize="xs">
                  {jobStatus.result.manifestErrors.map((err, i) => (
                    <Text key={i} color="fg.muted">
                      {err}
                    </Text>
                  ))}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          )}

          {/* Ошибки unpin */}
          {jobStatus.result.errors.length > 0 && (
            <Collapsible.Root>
              <Collapsible.Trigger asChild>
                <Button size="xs" variant="ghost" colorPalette="red">
                  <Icon as={LuTriangleAlert} mr={1} />
                  {jobStatus.result.errors.length} ошибок unpin
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Box mt={1} p={2} bg="bg.subtle" borderRadius="md" maxH="200px" overflowY="auto" fontSize="xs">
                  {jobStatus.result.errors.map((err, i) => (
                    <Text key={i} color="fg.muted">
                      {err}
                    </Text>
                  ))}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          )}

          <Separator />
          <Button size="xs" variant="ghost" onClick={() => setActiveJobId(null)}>
            Закрыть
          </Button>
        </VStack>
      )}

      {/* Ошибка */}
      {jobStatus && jobStatus.status === 'error' && (
        <VStack align="stretch" gap={2} mt={3}>
          <HStack gap={2}>
            <Icon as={LuTriangleAlert} color="red.500" />
            <Text fontWeight="medium" color="fg.error">
              Ошибка аудита — {jobStatus.serverName}
            </Text>
          </HStack>
          <Text fontSize="sm" color="fg.error">
            {jobStatus.errorMessage}
          </Text>

          {/* Показать частичные результаты если есть */}
          {jobStatus.result.unpinnedCount > 0 && (
            <Text fontSize="sm">
              Частично распинено: {jobStatus.result.unpinnedCount} из {jobStatus.result.orphanedCount}
            </Text>
          )}

          <Button size="xs" variant="ghost" onClick={() => setActiveJobId(null)}>
            Закрыть
          </Button>
        </VStack>
      )}
    </Box>
  )
}
