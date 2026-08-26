'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { formatFileSize } from '@/lib/ipfs'
import { Badge, Box, Button, Flex, HStack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuRefreshCw, LuTrash2 } from 'react-icons/lu'
import type { PinJob } from '../types'

/** Маппинг статусов задания */
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  QUEUED: { color: 'yellow', label: 'В очереди' },
  PINNING: { color: 'blue', label: 'Пиннинг...' },
  PINNED: { color: 'green', label: 'Запинено' },
  FAILED: { color: 'red', label: 'Ошибка' },
  UNPINNED: { color: 'gray', label: 'Откреплено' },
}

interface PinJobCardProps {
  job: PinJob
  /** Колбэк при мутации (удаление, повтор, открепление) — для инвалидации TanStack Query */
  onMutate?: () => void
}

/** Карточка задания на пиннинг */
export function PinJobCard({ job, onMutate }: PinJobCardProps) {
  const [loading, setLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  /** Удалить задание */
  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/pin-jobs/${job.id}`, { method: 'DELETE' })
      if (res.ok) {
        toaster.success({ title: 'Задание удалено' })
        onMutate?.()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка удаления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setDeleteLoading(false)
    }
  }

  /** Повторить задание */
  const handleRetry = async () => {
    setRetryLoading(true)
    try {
      const res = await fetch(`/api/admin/pin-jobs/${job.id}/retry`, { method: 'POST' })
      if (res.ok) {
        toaster.success({ title: 'Повтор запущен' })
        onMutate?.()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка повтора' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setRetryLoading(false)
    }
  }

  /** Открепить контент */
  const handleUnpin = async () => {
    if (!job.anime) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/unpin/${job.anime.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: job.server.id }),
      })
      if (res.ok) {
        toaster.success({ title: 'Контент откреплён' })
        onMutate?.()
      } else {
        toaster.error({ title: 'Ошибка открепления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка' })
    } finally {
      setLoading(false)
    }
  }

  const { color, label } = STATUS_MAP[job.status] ?? { color: 'gray', label: job.status }

  return (
    <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
      <Flex justify="space-between" align="center" mb={2}>
        <HStack gap={2}>
          <Badge colorPalette={color}>{label}</Badge>
          {job.anime && <Text fontWeight="semibold">{job.anime.title}</Text>}
        </HStack>
        <Text fontSize="xs" color="fg.muted">
          {new Date(job.createdAt).toLocaleString('ru')}
        </Text>
      </Flex>

      <HStack gap={4} flexWrap="wrap">
        <Text fontSize="sm" color="fg.muted">
          CID: <code>{job.cid.slice(0, 16)}...</code>
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Сервер: {job.server.name}
        </Text>
        {job.size > 0 && (
          <Text fontSize="sm" color="fg.muted">
            {formatFileSize(job.size)}
          </Text>
        )}
        {job.createdBy.name && (
          <Text fontSize="sm" color="fg.muted">
            Автор: {job.createdBy.name}
          </Text>
        )}
      </HStack>

      {/* Прогресс пиннинга */}
      {job.status === 'PINNING'
        && job.progressBlocks > 0
        && (() => {
          const hasDetails = job.anime?.directoryBlocks && job.anime?.directorySize
          const percent = hasDetails
            ? Math.min(100, Math.round((job.progressBlocks / job.anime!.directoryBlocks!) * 100))
            : null

          // Пропорциональный расчёт скачанного, ограниченный общим размером
          // (pin-queue может считать больше блоков, чем desktop записал в directoryBlocks)
          const ratio = hasDetails ? Math.min(job.progressBlocks / job.anime!.directoryBlocks!, 1) : null
          const downloadedMB = ratio !== null
            ? Math.round(ratio * (job.anime!.directorySize! / (1024 * 1024)))
            : Math.round((job.progressBlocks * 256) / 1024)
          const totalMB = hasDetails ? Math.round(job.anime!.directorySize! / (1024 * 1024)) : null

          return (
            <Text fontSize="sm" color="blue.500" mt={1}>
              {totalMB !== null
                ? `Загружено ~${downloadedMB} MB из ${totalMB} MB (${percent}%)`
                : `Загружено ~${downloadedMB} MB (${job.progressBlocks} блоков)`}
            </Text>
          )
        })()}
      {job.status === 'PINNING' && job.progressBlocks === 0 && (
        <Text fontSize="sm" color="fg.muted" mt={1}>
          Ожидание начала загрузки...
        </Text>
      )}
      {job.status === 'QUEUED' && (
        <Text fontSize="sm" color="yellow.600" mt={1}>
          Ожидает в очереди пинера...
        </Text>
      )}

      {job.error && (
        <Text fontSize="sm" color="red.500" mt={1}>
          {job.error}
        </Text>
      )}

      <HStack gap={2} mt={2}>
        {job.status === 'PINNED' && job.anime && (
          <Button size="xs" variant="outline" colorPalette="red" onClick={handleUnpin} loading={loading}>
            Открепить
          </Button>
        )}
        {job.status === 'FAILED' && (
          <Button size="xs" colorPalette="blue" loading={retryLoading} onClick={handleRetry}>
            <LuRefreshCw style={{ marginRight: '4px' }} />
            Повторить
          </Button>
        )}
        {job.status !== 'PINNED' && (
          <Button size="xs" variant="outline" colorPalette="red" loading={deleteLoading} onClick={handleDelete}>
            <LuTrash2 style={{ marginRight: '4px' }} />
            Удалить
          </Button>
        )}
      </HStack>
    </Box>
  )
}
