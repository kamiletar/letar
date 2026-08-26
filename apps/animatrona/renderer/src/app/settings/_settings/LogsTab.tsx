'use client'

/**
 * Вкладка "Логи" — live-просмотр main.log с автообновлением.
 *
 * Возможности:
 * - Загрузка хвоста файла (последние 200/500/1000 строк)
 * - Live-обновление новых строк через polling в main
 * - Подсветка по уровню (ERR/WRN/INF/DBG)
 * - Авто-скролл к низу при новых сообщениях (можно отключить)
 * - Фильтр по подстроке
 * - Очистка отображения (не очищает файл)
 */

import { Badge, Box, Button, HStack, Input, Switch, Text, VStack } from '@chakra-ui/react'
import { NativeSelectField, NativeSelectRoot } from '@chakra-ui/react/native-select'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuArrowDown, LuFileText, LuRefreshCw, LuTrash } from 'react-icons/lu'

interface LogLine {
  raw: string
  level: 'ERR' | 'WRN' | 'INF' | 'DBG' | 'OTHER'
  module: string
  text: string
  timestamp: string
}

const LEVEL_COLOR: Record<LogLine['level'], string> = {
  ERR: 'red.400',
  WRN: 'orange.400',
  INF: 'green.400',
  DBG: 'fg.muted',
  OTHER: 'fg',
}

/** Парсим строку лога формата: "ISO_TIMESTAMP LEVEL [Module] message" */
function parseLine(raw: string): LogLine {
  // Пример: "2026-04-28T10:33:03.862Z INF [KuboService] Путь к Kubo бинарнику [kuboBin=...]"
  const match = raw.match(/^(\S+)\s+(ERR|WRN|INF|DBG)\s+\[([^\]]+)\]\s*(.*)$/)
  if (match) {
    return {
      raw,
      level: match[1] as LogLine['level'],
      timestamp: match[1],
      module: match[3],
      text: match[4],
    }
  }
  return { raw, level: 'OTHER', timestamp: '', module: '', text: raw }
}

export function LogsTab() {
  const [lines, setLines] = useState<LogLine[]>([])
  const [filter, setFilter] = useState('')
  const [tailLines, setTailLines] = useState(500)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Подгрузить tail при mount/изменении lines count
  const loadTail = useCallback(async () => {
    if (!window.electronAPI) {
      return
    }
    try {
      const res = await window.electronAPI.logs.tail(tailLines)
      setFilePath(res.filePath)
      const parsed = res.content
        .split('\n')
        .filter((l) => l.length > 0)
        .map(parseLine)
      setLines(parsed)
    } catch (err) {
      console.error('[Logs] tail error:', err)
    }
  }, [tailLines])

  useEffect(() => {
    void loadTail()
  }, [loadTail])

  // Live-watch: подписка на новые строки
  useEffect(() => {
    if (!window.electronAPI) {
      return
    }
    void window.electronAPI.logs.startWatch().then((res) => {
      if (res.success) {
        setWatching(true)
      }
    })
    const unsub = window.electronAPI.logs.onNewLines((newLines) => {
      const parsed = newLines.map(parseLine)
      setLines((prev) => {
        const combined = [...prev, ...parsed]
        // Ограничиваем размер буфера в UI чтобы не съедать память
        if (combined.length > 5000) {
          return combined.slice(-5000)
        }
        return combined
      })
    })
    return () => {
      unsub?.()
      void window.electronAPI?.logs.stopWatch()
      setWatching(false)
    }
  }, [])

  // Auto-scroll при новых строках
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  // Фильтрация
  const filtered = filter.trim() ? lines.filter((l) => l.raw.toLowerCase().includes(filter.toLowerCase())) : lines

  return (
    <VStack gap={3} align="stretch" maxW="100%">
      {/* Заголовок и путь к файлу */}
      <HStack gap={2}>
        <LuFileText size={20} color="var(--chakra-colors-blue-400)" />
        <Text fontWeight={500}>Системные логи</Text>
        {watching && (
          <Badge colorPalette="green" variant="subtle" size="sm">
            live
          </Badge>
        )}
      </HStack>
      {filePath && (
        <Text fontSize="xs" color="fg.muted" fontFamily="mono">
          {filePath}
        </Text>
      )}

      {/* Контролы */}
      <HStack gap={2} wrap="wrap">
        <Input
          placeholder="Фильтр по подстроке..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="sm"
          maxW="280px"
        />
        <NativeSelectRoot size="sm" maxW="140px">
          <NativeSelectField value={tailLines} onChange={(e) => setTailLines(Number(e.target.value))}>
            <option value={200}>Последние 200</option>
            <option value={500}>Последние 500</option>
            <option value={1000}>Последние 1000</option>
            <option value={2000}>Последние 2000</option>
          </NativeSelectField>
        </NativeSelectRoot>
        <Button size="sm" variant="outline" onClick={() => void loadTail()}>
          <LuRefreshCw size={16} />
          Обновить
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setLines([])}>
          <LuTrash size={16} />
          Очистить
        </Button>
        <HStack gap={2}>
          <Switch.Root checked={autoScroll} onCheckedChange={(e) => setAutoScroll(e.checked)} size="sm">
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label>
              <HStack gap={1}>
                <LuArrowDown size={12} />
                <Text fontSize="xs">Авто-скролл</Text>
              </HStack>
            </Switch.Label>
          </Switch.Root>
        </HStack>
      </HStack>

      {/* Контейнер с логами */}
      <Box
        ref={containerRef}
        bg="bg.muted"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.subtle"
        p={2}
        height="600px"
        overflowY="auto"
        fontFamily="mono"
        fontSize="xs"
      >
        <VStack gap={0.5} align="stretch">
          {filtered.length === 0 && (
            <Text color="fg.muted" p={4} textAlign="center">
              {filter ? 'Нет совпадений по фильтру' : 'Лог пуст'}
            </Text>
          )}
          {filtered.map((line, i) => (
            <Box
              key={i}
              borderLeft="2px solid"
              borderColor={LEVEL_COLOR[line.level]}
              pl={2}
              py={0.5}
              _hover={{ bg: 'bg.subtle' }}
            >
              <HStack gap={2} align="start">
                <Text color="fg.muted" minW="170px" fontSize="2xs">
                  {line.timestamp}
                </Text>
                <Text color={LEVEL_COLOR[line.level]} minW="36px" fontWeight={500} fontSize="2xs">
                  {line.level}
                </Text>
                {line.module && (
                  <Text color="cyan.400" minW="120px" fontSize="2xs">
                    [{line.module}]
                  </Text>
                )}
                <Text flex={1} whiteSpace="pre-wrap" wordBreak="break-word">
                  {line.text || line.raw}
                </Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      <Text fontSize="xs" color="fg.muted">
        Показано: {filtered.length} из {lines.length} строк
      </Text>
    </VStack>
  )
}
