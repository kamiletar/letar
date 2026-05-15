'use client'

import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/app/_components/ui/dialog'
import { AnsiText } from '@/lib/ansi-to-react'
import { Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { LuDownload } from 'react-icons/lu'

interface LogsDialogProps {
  /** Управление открытием/закрытием диалога */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Заголовок диалога */
  title: string
  /** Функция для загрузки логов */
  fetchLogs: (lines?: number) => Promise<string>
  /** Query key для TanStack Query */
  queryKey: string[]
  /** Имя файла для экспорта (если поддерживается экспорт) */
  exportFilename?: string
  /** Показывать селектор количества строк */
  showLineSelector?: boolean
  /** Показывать кнопку экспорта */
  showExport?: boolean
  /** Интервал автообновления в мс (0 = отключено) */
  autoRefreshInterval?: number
  /** Дополнительная информация для футера */
  footerInfo?: string
}

/**
 * Универсальный диалог для отображения логов
 * Используется для логов контейнеров, деплоев и других источников
 */
export function LogsDialog({
  open,
  onOpenChange,
  title,
  fetchLogs,
  queryKey,
  exportFilename,
  showLineSelector = false,
  showExport = false,
  autoRefreshInterval = 0,
  footerInfo,
}: LogsDialogProps) {
  const [lines, setLines] = useState(100)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsRef = useRef<HTMLDivElement>(null)

  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKey, lines],
    queryFn: () => fetchLogs(lines),
    enabled: open,
    refetchInterval: open && autoRefreshInterval > 0 ? autoRefreshInterval : false,
  })

  // Автоскролл вниз при обновлении логов
  useEffect(() => {
    if (autoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleExport = () => {
    if (!logs || !exportFilename) {
      return
    }

    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" placement="center">
      <DialogContent maxW="900px" maxH="80vh">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody pb="6">
          <VStack align="stretch" gap="4">
            {/* Контролы */}
            <HStack justify="space-between" flexWrap="wrap" gap="2">
              {showLineSelector && (
                <HStack gap="2">
                  <Text fontSize="sm" color="fg.muted">
                    Строк:
                  </Text>
                  {[50, 100, 200, 500].map((n) => (
                    <Button
                      key={n}
                      size="xs"
                      variant={lines === n ? 'solid' : 'outline'}
                      colorPalette={lines === n ? 'fg' : undefined}
                      onClick={() => setLines(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </HStack>
              )}
              <HStack gap="2" ml="auto">
                {autoRefreshInterval > 0 && (
                  <Button
                    size="xs"
                    variant={autoScroll ? 'solid' : 'outline'}
                    colorPalette={autoScroll ? 'green' : undefined}
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    Auto-scroll {autoScroll ? 'ON' : 'OFF'}
                  </Button>
                )}
                <Button size="xs" variant="outline" onClick={() => refetch()}>
                  Обновить
                </Button>
                {showExport && (
                  <Button size="xs" variant="outline" colorPalette="fg" onClick={handleExport} disabled={!logs}>
                    <LuDownload />
                    Экспорт
                  </Button>
                )}
              </HStack>
            </HStack>

            {/* Область логов */}
            <Box
              ref={logsRef}
              bg="bg.subtle"
              borderRadius="md"
              p="4"
              h="500px"
              overflow="auto"
              fontFamily="mono"
              fontSize="xs"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
            >
              {isLoading && !logs ? (
                <HStack justify="center" py="8">
                  <Spinner size="sm" />
                  <Text color="fg.muted">Загрузка логов...</Text>
                </HStack>
              ) : error ? (
                <Text color="red.400">
                  Ошибка: {error instanceof Error ? error.message : 'Не удалось загрузить логи'}
                </Text>
              ) : logs ? (
                logs.split('\n').map((line, index) => (
                  /* oxlint-disable-next-line eslint-plugin-react/no-array-index-key -- Log lines are append-only */
                  <Box key={index} display="block">
                    <AnsiText text={line} />
                  </Box>
                ))
              ) : (
                <Text color="fg.muted">Логи отсутствуют</Text>
              )}
            </Box>

            {/* Футер */}
            <HStack justify="space-between" fontSize="xs" color="fg.muted">
              {footerInfo && <Text>{footerInfo}</Text>}
              {autoRefreshInterval > 0 && <Text ml="auto">Авто-обновление: каждые {autoRefreshInterval / 1000}с</Text>}
            </HStack>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
