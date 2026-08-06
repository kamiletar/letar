'use client'

/**
 * Диалог с real-time логами деплоя
 */

import { Box, Button, Dialog, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'

// =============================================================================
// ANSI to HTML парсер
// =============================================================================

/** Маппинг ANSI кодов на CSS цвета */
const ANSI_COLORS: Record<number, string> = {
  // Стандартные цвета (30-37)
  30: '#1e1e1e', // black
  31: '#ef4444', // red
  32: '#22c55e', // green
  33: '#eab308', // yellow
  34: '#3b82f6', // blue
  35: '#a855f7', // magenta
  36: '#06b6d4', // cyan
  37: '#e5e5e5', // white
  // Яркие цвета (90-97)
  90: '#737373', // bright black (gray)
  91: '#f87171', // bright red
  92: '#4ade80', // bright green
  93: '#facc15', // bright yellow
  94: '#60a5fa', // bright blue
  95: '#c084fc', // bright magenta
  96: '#22d3ee', // bright cyan
  97: '#ffffff', // bright white
}

interface AnsiSegment {
  text: string
  color?: string
  bold?: boolean
}

// Регулярка для ANSI escape кодов — строим через new RegExp, чтобы избежать control char в литерале
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = new RegExp('\u001B\\[([0-9;]*)m', 'g')

/**
 * Парсит строку с ANSI escape кодами в массив сегментов
 */
function parseAnsi(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = []
  const regex = new RegExp(ANSI_REGEX.source, 'g')

  let lastIndex = 0
  let currentColor: string | undefined
  let currentBold = false
  let match

  while ((match = regex.exec(input)) !== null) {
    // Добавляем текст до escape-последовательности
    if (match.index > lastIndex) {
      const text = input.slice(lastIndex, match.index)
      if (text) {
        segments.push({ text, color: currentColor, bold: currentBold })
      }
    }

    // Парсим коды
    const codes = match[1].split(';').map(Number)
    for (const code of codes) {
      if (code === 0) {
        // Reset
        currentColor = undefined
        currentBold = false
      } else if (code === 1) {
        // Bold
        currentBold = true
      } else if (ANSI_COLORS[code]) {
        currentColor = ANSI_COLORS[code]
      }
    }

    lastIndex = regex.lastIndex
  }

  // Добавляем оставшийся текст
  if (lastIndex < input.length) {
    const text = input.slice(lastIndex)
    if (text) {
      segments.push({ text, color: currentColor, bold: currentBold })
    }
  }

  return segments
}

/**
 * Компонент для отображения строки с ANSI цветами
 */
function AnsiLine({ line }: { line: string }) {
  const segments = parseAnsi(line)

  // Если нет ANSI кодов, показываем как есть с умным определением цвета
  if (segments.length === 1 && !segments[0].color) {
    const text = segments[0].text
    let color = 'gray.100'

    if (text.startsWith('✅') || text.includes('Successfully') || text.includes('success')) {
      color = 'green.400'
    } else if (text.startsWith('❌') || text.includes('error') || text.includes('Error') || text.includes('failed')) {
      color = 'red.400'
    } else if (text.startsWith('⚠️') || text.includes('warning') || text.includes('Warning')) {
      color = 'yellow.400'
    } else if (text.startsWith('🚀') || text.startsWith('📋')) {
      color = 'blue.400'
    }

    return (
      <Box color={color} py="0.5">
        {text}
      </Box>
    )
  }

  return (
    <Box py="0.5">
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{
            color: seg.color,
            fontWeight: seg.bold ? 'bold' : 'normal',
          }}
        >
          {seg.text}
        </span>
      ))}
    </Box>
  )
}

interface DeployStatus {
  running: boolean
  action?: string
  startTime?: string
  output: string[]
  error?: string
  appName?: string
}

interface DeployLogDialogProps {
  isOpen: boolean
  serverId: string
  appId: string
  appName: string
  onClose: () => void
  onDeployComplete: () => void
}

export function DeployLogDialog({ isOpen, serverId, appId, appName, onClose, onDeployComplete }: DeployLogDialogProps) {
  const [status, setStatus] = useState<DeployStatus | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployStarted, setDeployStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Автопрокрутка логов вниз
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [status?.output])

  // Запуск деплоя при открытии диалога
  useEffect(() => {
    if (isOpen && !deployStarted) {
      setDeployStarted(true)
      setIsDeploying(true)
      setError(null)
      setStatus({ running: true, output: [`🚀 Запуск деплоя ${appName}...`] })

      // Запускаем деплой — теперь он сразу возвращается, логи приходят через polling
      fetch(`/api/servers/${serverId}/apps/${appId}/deploy`, { method: 'POST' })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Deploy failed')
          }
          // Деплой запущен, логи будут приходить через polling
          setStatus((prev) => ({
            ...prev,
            running: true,
            output: [...(prev?.output || []), `📋 Деплой запущен на сервере`],
          }))
        })
        .catch((err) => {
          setError(err.message)
          setStatus((prev) => ({
            ...prev,
            running: false,
            output: [...(prev?.output || []), `❌ Ошибка запуска: ${err.message}`],
            error: err.message,
          }))
          setIsDeploying(false)
        })
    }
  }, [isOpen, deployStarted, serverId, appId, appName])

  // Polling статуса деплоя с agent (каждые 1 сек пока деплой идёт)
  useEffect(() => {
    if (!isOpen || !isDeploying) {
      return
    }

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/servers/${serverId}/deploy/status`)
        if (res.ok) {
          const data: DeployStatus = await res.json()
          if (data.output && data.output.length > 0) {
            setStatus((prev) => ({
              ...prev,
              running: data.running,
              output: data.output,
              error: data.error,
            }))

            // Деплой завершился
            if (!data.running) {
              setIsDeploying(false)
              if (data.error) {
                setError(data.error)
              } else {
                onDeployComplete()
              }
            }
          }
        }
      } catch {
        // Игнорируем ошибки polling
      }
    }

    // Первый poll сразу
    pollStatus()

    const interval = setInterval(pollStatus, 1000) // Каждую секунду для более responsive UI
    return () => clearInterval(interval)
  }, [isOpen, isDeploying, serverId, onDeployComplete])

  // Отмена деплоя
  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/servers/${serverId}/deploy/cancel`, { method: 'POST' })
      const data = await res.json()
      if (data.cancelled) {
        setStatus((prev) => ({
          ...prev,
          running: false,
          output: [...(prev?.output || []), '🛑 Деплой отменён пользователем'],
        }))
        setIsDeploying(false)
      }
    } catch {
      // Игнорируем ошибки отмены
    }
  }

  // Сброс при закрытии
  const handleClose = () => {
    setDeployStarted(false)
    setStatus(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="3xl" w="90vw">
          <Dialog.Header>
            <Dialog.Title>
              <HStack>
                {isDeploying ? <Spinner size="sm" /> : error
                  ? (
                    <Box color="red.500">
                      <LuX />
                    </Box>
                  )
                  : (
                    <Box color="green.500">
                      <LuCheck />
                    </Box>
                  )}
                <Text>Деплой {appName}</Text>
              </HStack>
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="stretch" gap="4">
              {/* Статус */}
              <HStack fontSize="sm" color="fg.muted">
                <Text>Статус:</Text>
                <Text fontWeight="medium" color={isDeploying ? 'yellow.500' : error ? 'red.500' : 'green.500'}>
                  {isDeploying ? 'Выполняется...' : error ? 'Ошибка' : 'Завершён'}
                </Text>
              </HStack>

              {/* Логи */}
              <Box
                ref={logContainerRef}
                bg="gray.900"
                color="gray.100"
                p="4"
                borderRadius="md"
                fontFamily="mono"
                fontSize="xs"
                maxH="400px"
                overflowY="auto"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
              >
                {status?.output?.map((line, i) => <AnsiLine key={i} line={line} />) || (
                  <Text color="fg.muted">Ожидание...</Text>
                )}
              </Box>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap="2">
              {isDeploying && (
                <Button colorPalette="red" variant="outline" onClick={handleCancel}>
                  Отменить деплой
                </Button>
              )}
              <Button variant="outline" onClick={handleClose} disabled={isDeploying}>
                {isDeploying ? 'Деплой выполняется...' : 'Закрыть'}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
