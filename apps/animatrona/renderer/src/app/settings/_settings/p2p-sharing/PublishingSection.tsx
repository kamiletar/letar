'use client'

/**
 * Секция публикации библиотеки
 */

import {
  Badge,
  Box,
  Button,
  Switch as ChakraSwitch,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuCloudUpload, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'

import { ProgressLog, type ProgressLogEntry } from '@/components/ui/ProgressLog'

import type { useP2PSharing } from '../use-p2p-sharing'
import { formatDate } from './format-utils'

interface PublishingSectionProps {
  publisher: ReturnType<typeof useP2PSharing>['publisher']
  ipfsRunning: boolean
  onUpdateConfig: (updates: { libraryName?: string; enabled?: boolean; autoPublish?: boolean }) => Promise<void>
  onPublish: () => Promise<unknown>
  /** Вызывается после успешной регенерации манифестов (для инвалидации кэша) */
  onRegenerateComplete?: () => void
}

interface RegenResult {
  success: number
  failed: number
  errors: Array<{ animeId: string; error: string }>
}

export function PublishingSection({
  publisher,
  ipfsRunning,
  onUpdateConfig,
  onPublish,
  onRegenerateComplete,
}: PublishingSectionProps) {
  const [libraryName, setLibraryName] = useState(publisher.config?.libraryName || '')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [diskFullError, setDiskFullError] = useState(false)
  const [regenResult, setRegenResult] = useState<RegenResult | null>(null)
  const [regenLog, setRegenLog] = useState<ProgressLogEntry[]>([])
  const [regenProgress, setRegenProgress] = useState<{ current: number; total: number } | null>(null)
  const regenLogRef = useRef<ProgressLogEntry[]>([])
  /** Текущий шаг: «[N/249] Аниме» — показывается над детальным логом */
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [healthSummary, setHealthSummary] = useState<{
    complete: number
    degraded: number
    broken: number
    unknown: number
  } | null>(null)
  const [showDegradedDialog, setShowDegradedDialog] = useState(false)
  const [regenCheckpoint, setRegenCheckpoint] = useState<{
    startedAt: string
    total: number
    pending: number
  } | null>(null)
  const [degradedList, setDegradedList] = useState<
    Array<{
      id: string
      name: string
      contentHealth: string | null
      missingCidsJson: string | null
      missingFontsJson: string | null
    }>
  >([])

  // Синхронизация с config когда он загружается
  useEffect(() => {
    if (publisher.config?.libraryName && !libraryName) {
      setLibraryName(publisher.config.libraryName)
    }
  }, [publisher.config?.libraryName, libraryName])

  // Подписка на прогресс регенерации
  useEffect(() => {
    const unsub = window.electronAPI?.animeManifest.onRegenerateProgress((data) => {
      setRegenProgress({ current: data.current, total: data.total })

      if (data.status === 'processing') {
        // Обновляем индикатор текущего шага
        setCurrentStep(`[${data.current}/${data.total}] ${data.animeName}`)
        // Добавляем новую запись «в обработке»
        const entry: ProgressLogEntry = { name: data.animeName, status: 'processing' }
        regenLogRef.current = [...regenLogRef.current, entry]
        setRegenLog(regenLogRef.current)
      } else {
        // Обновляем последнюю запись с тем же именем
        regenLogRef.current = regenLogRef.current.map((e) =>
          e.name === data.animeName ? { ...e, status: data.status, error: data.error } : e
        )
        setRegenLog(regenLogRef.current)
      }
    })
    return () => unsub?.()
  }, [])

  // На mount: запрашиваем persist-state из main — может быть регенерация уже идёт,
  // или только что закончилась пока пользователь был на другой странице.
  // Также проверяем чекпоинт прерванной регенерации.
  useEffect(() => {
    if (!window.electronAPI) {
      return
    }
    void (async () => {
      try {
        const res = await window.electronAPI!.animeManifest.getRegenerationStatus()
        if (!res.success || !res.data) {
          return
        }
        const status = res.data
        if (status.isRegenerating) {
          // Восстанавливаем UI в активном состоянии
          setIsRegenerating(true)
          // Используем prev-форму чтобы не затереть более свежие данные от live-событий,
          // которые успели прийти пока шёл асинхронный запрос getRegenerationStatus.
          setRegenProgress((prev) => prev ?? { current: status.current, total: status.total })
          if (status.currentAnimeName) {
            setCurrentStep((prev) => prev ?? `[${status.current}/${status.total}] ${status.currentAnimeName}`)
            // Добавляем запись в ProgressLog только если live-события ещё не заполнили его
            if (regenLogRef.current.length === 0) {
              const entry: ProgressLogEntry = { name: status.currentAnimeName, status: 'processing' }
              regenLogRef.current = [entry]
              setRegenLog(regenLogRef.current)
            }
          }
        }
        if (status.result && !status.isRegenerating) {
          // Регенерация уже закончилась — показываем итог
          setRegenResult(status.result)
        }
      } catch {
        /* не критично */
      }

      // Загружаем чекпоинт прерванной регенерации (если есть)
      try {
        const checkpointRes = await window.electronAPI!.animeManifest.getRegenCheckpoint()
        if (checkpointRes.success && checkpointRes.data) {
          setRegenCheckpoint(checkpointRes.data)
        }
      } catch {
        /* не критично */
      }
    })()
  }, [])

  // Подписка на live-лог регенерации (детальные сообщения от main)
  const [detailedLog, setDetailedLog] = useState<
    Array<{
      id: string
      timestamp: number
      level: 'info' | 'warn' | 'error' | 'success'
      message: string
      meta?: Record<string, unknown>
    }>
  >([])
  useEffect(() => {
    if (!window.electronAPI) {
      return
    }
    // На mount — подтягиваем накопленный лог из main
    void (async () => {
      try {
        const res = await window.electronAPI!.animeManifest.getRegenerationStatus()
        if (res.success && res.data) {
          // Мержим с live-событиями, которые успели прийти пока шёл асинхронный запрос.
          // Если просто перезаписать — потеряем события между стартом fetch и его завершением.
          setDetailedLog((prev) => {
            if (prev.length === 0) {
              return res.data!.log
            }
            const fetchedIds = new Set(res.data!.log.map((e) => e.id))
            const liveExtra = prev.filter((e) => !fetchedIds.has(e.id))
            return [...res.data!.log, ...liveExtra].sort((a, b) => a.timestamp - b.timestamp)
          })
        }
      } catch {
        /* не критично */
      }
    })()
    // При старте нового цикла — очищаем старый лог (иначе хвост предыдущего запуска мешает)
    const unsubStarted = window.electronAPI.animeManifest.onRegenerateStarted(() => {
      setDetailedLog([])
      setCurrentStep(null)
    })
    const unsub = window.electronAPI.animeManifest.onRegenerateLog((entry) => {
      setDetailedLog((prev) => {
        // Дедуп по id
        if (prev.some((e) => e.id === entry.id)) {
          return prev
        }
        const next = [...prev, entry]
        // Ограничиваем размер для UI
        if (next.length > 500) {
          return next.slice(-500)
        }
        return next
      })
    })
    return () => {
      unsubStarted?.()
      unsub?.()
    }
  }, [])

  // Подписка на завершение регенерации (срабатывает даже если пользователь ушёл и вернулся)
  useEffect(() => {
    if (!window.electronAPI) {
      return
    }
    const unsub = window.electronAPI.animeManifest.onRegenerateFinished(async (data) => {
      setIsRegenerating(false)
      setCurrentStep(null)
      if (data.diskFull) {
        setDiskFullError(true)
      }
      // Подтягиваем итоговый result + healthSummary
      try {
        const statusRes = await window.electronAPI!.animeManifest.getRegenerationStatus()
        if (statusRes.success && statusRes.data?.result) {
          setRegenResult(statusRes.data.result)
        }
        const healthRes = await window.electronAPI!.animeManifest.getHealthSummary()
        if (healthRes.success && healthRes.data) {
          setHealthSummary(healthRes.data)
        }
      } catch {
        /* не критично */
      }
    })
    return () => unsub?.()
  }, [])

  const handleSaveName = () => {
    if (libraryName.trim() && libraryName !== publisher.config?.libraryName) {
      void onUpdateConfig({ libraryName: libraryName.trim() })
    }
  }

  const handleResume = useCallback(async () => {
    if (!window.electronAPI || !regenCheckpoint) {
      return
    }
    setIsRegenerating(true)
    setDiskFullError(false)
    setRegenResult(null)
    setRegenLog([])
    setRegenProgress(null)
    setCurrentStep(null)
    setHealthSummary(null)
    regenLogRef.current = []
    setRegenCheckpoint(null)
    try {
      const response = await window.electronAPI.animeManifest.regenerateAll({
        resumeFrom: regenCheckpoint.startedAt,
      })
      if (response.data) {
        setRegenResult(response.data)
      } else {
        setRegenResult({
          success: 0,
          failed: 1,
          errors: [{ animeId: '', error: response.error || 'Неизвестная ошибка' }],
        })
      }
      try {
        const healthRes = await window.electronAPI.animeManifest.getHealthSummary()
        if (healthRes.success && healthRes.data) {
          setHealthSummary(healthRes.data)
        }
      } catch {
        /* не критично */
      }
    } catch (error) {
      setRegenResult({ success: 0, failed: 1, errors: [{ animeId: '', error: String(error) }] })
    } finally {
      setIsRegenerating(false)
      onRegenerateComplete?.()
    }
  }, [regenCheckpoint, onRegenerateComplete])

  const handleRegenerateAll = useCallback(async () => {
    if (!window.electronAPI) {
      return
    }
    setIsRegenerating(true)
    setDiskFullError(false)
    setRegenResult(null)
    setRegenLog([])
    setRegenProgress(null)
    setCurrentStep(null)
    setHealthSummary(null)
    regenLogRef.current = []
    setRegenCheckpoint(null)
    try {
      const response = await window.electronAPI.animeManifest.regenerateAll()
      if (response.data) {
        setRegenResult(response.data)
      } else {
        setRegenResult({
          success: 0,
          failed: 1,
          errors: [{ animeId: '', error: response.error || 'Неизвестная ошибка' }],
        })
      }

      // Подтягиваем сводку по contentHealth после регенерации
      try {
        const healthRes = await window.electronAPI.animeManifest.getHealthSummary()
        if (healthRes.success && healthRes.data) {
          setHealthSummary(healthRes.data)
        }
      } catch {
        /* не критично */
      }
    } catch (error) {
      setRegenResult({ success: 0, failed: 1, errors: [{ animeId: '', error: String(error) }] })
    } finally {
      setIsRegenerating(false)
      onRegenerateComplete?.()
    }
  }, [onRegenerateComplete])

  const handleStop = useCallback(async () => {
    if (!window.electronAPI) {
      return
    }
    await window.electronAPI.animeManifest.stopRegeneration()
  }, [])

  const handleShowDegraded = useCallback(async () => {
    if (!window.electronAPI) {
      return
    }
    try {
      const res = await window.electronAPI.animeManifest.getDegradedAndBroken()
      if (res.success && res.data) {
        setDegradedList(res.data)
        setShowDegradedDialog(true)
      }
    } catch (error) {
      console.error('[Publishing] getDegradedAndBroken error:', error)
    }
  }, [])

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuCloudUpload} color="blue.400" boxSize={5} />
        <Heading size="sm">Публикация библиотеки</Heading>
        {publisher.animeCount > 0 && (
          <Badge colorPalette="blue" size="sm">
            {publisher.animeCount} аниме • {publisher.episodeCount} эп.
          </Badge>
        )}
      </HStack>

      {!ipfsRunning ? (
        <Text color="fg.subtle">Запустите IPFS ноду для публикации</Text>
      ) : publisher.isLoading ? (
        <Text color="fg.subtle">Загрузка...</Text>
      ) : publisher.animeCount === 0 ? (
        <Box p={3} bg="orange.subtle" borderRadius="md">
          <Text fontSize="sm" color="orange.fg">
            Нет аниме для публикации. Импортируйте контент через очередь кодирования.
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          {/* Название библиотеки */}
          <Box>
            <Text fontSize="sm" color="fg.subtle" mb={2}>
              Название библиотеки
            </Text>
            <HStack>
              <Input
                size="sm"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="Моя библиотека"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveName}
                disabled={!libraryName.trim() || libraryName === publisher.config?.libraryName}
              >
                Сохранить
              </Button>
            </HStack>
          </Box>

          {/* Переключатели */}
          <Flex justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="sm">Включить публикацию</Text>
              <Text fontSize="xs" color="fg.subtle">
                Ваша библиотека будет доступна другим пользователям
              </Text>
            </VStack>
            <ChakraSwitch.Root
              checked={publisher.config?.enabled ?? false}
              onCheckedChange={(e) => void onUpdateConfig({ enabled: e.checked })}
            >
              <ChakraSwitch.HiddenInput />
              <ChakraSwitch.Control />
            </ChakraSwitch.Root>
          </Flex>

          <Flex justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="sm">Автопубликация</Text>
              <Text fontSize="xs" color="fg.subtle">
                Автоматически публиковать при добавлении нового контента
              </Text>
            </VStack>
            <ChakraSwitch.Root
              checked={publisher.config?.autoPublish ?? false}
              onCheckedChange={(e) => void onUpdateConfig({ autoPublish: e.checked })}
              disabled={!publisher.config?.enabled}
            >
              <ChakraSwitch.HiddenInput />
              <ChakraSwitch.Control />
            </ChakraSwitch.Root>
          </Flex>

          {/* Прогресс публикации */}
          {publisher.isPublishing && publisher.progress && (
            <Box p={3} bg="bg.subtle" borderRadius="md">
              <Text fontSize="sm" mb={2}>
                {publisher.progress.stage === 'loading' && 'Загрузка данных из БД...'}
                {publisher.progress.stage === 'generating' && 'Генерация манифеста...'}
                {publisher.progress.stage === 'publishing' && 'Публикация IPNS...'}
              </Text>
              <Progress.Root value={(publisher.progress.current / publisher.progress.total) * 100} size="sm">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Text fontSize="xs" color="fg.subtle" mt={1}>
                {publisher.progress.current} / {publisher.progress.total}
              </Text>
            </Box>
          )}

          {/* Информация о публикации */}
          {publisher.config?.lastPublishedCid && (
            <Box p={3} bg="bg.subtle" borderRadius="md">
              <Text fontSize="xs" color="fg.subtle" mb={1}>
                Последняя публикация
              </Text>
              <Text fontFamily="mono" fontSize="xs" color="fg.muted" wordBreak="break-all">
                {publisher.config.lastPublishedCid}
              </Text>
              <Text fontSize="xs" color="fg.subtle" mt={1}>
                {formatDate(publisher.config.lastPublishedAt)}
              </Text>
            </Box>
          )}

          {/* Кнопка публикации */}
          <Button
            size="sm"
            colorPalette="blue"
            onClick={onPublish}
            loading={publisher.isPublishing}
            disabled={!publisher.config?.enabled}
          >
            <Icon as={LuCloudUpload} mr={2} />
            Опубликовать сейчас
          </Button>
        </VStack>
      )}

      {/* Регенерация манифестов — показывается всегда когда IPFS запущен, не зависит от загрузки конфига */}
      {ipfsRunning && (
        <VStack align="stretch" gap={4} mt={publisher.isLoading || publisher.animeCount === 0 ? 4 : 4}>
          <Box>
            {regenCheckpoint && !isRegenerating ? (
              /* Чекпоинт — регенерация была прервана */
              <VStack align="start" gap={2}>
                <Text fontSize="xs" color="orange.400" fontWeight="medium">
                  ⚠ Регенерация прервана: осталось {regenCheckpoint.pending} из {regenCheckpoint.total} аниме
                </Text>
                <HStack gap={2}>
                  <Button
                    size="sm"
                    colorPalette="orange"
                    onClick={handleResume}
                    loading={isRegenerating}
                    loadingText="Регенерация..."
                  >
                    <Icon as={LuRefreshCw} mr={2} />
                    Продолжить ({regenCheckpoint.pending} осталось)
                  </Button>
                  {isRegenerating ? (
                    <Button size="sm" colorPalette="red" variant="subtle" onClick={handleStop}>
                      Остановить
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleRegenerateAll}>
                      Начать заново
                    </Button>
                  )}
                </HStack>
              </VStack>
            ) : (
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerateAll}
                  loading={isRegenerating}
                  loadingText="Регенерация..."
                >
                  <Icon as={LuRefreshCw} mr={2} />
                  Регенерировать манифесты
                </Button>
                {isRegenerating && (
                  <Button size="sm" colorPalette="red" variant="subtle" onClick={handleStop}>
                    Остановить
                  </Button>
                )}
              </HStack>
            )}
            <Text fontSize="xs" color="fg.subtle" mt={1}>
              Перестроить дорожки и метаданные для всех эпизодов
            </Text>
          </Box>

          {/* Прогресс и лог регенерации */}
          {(isRegenerating || regenLog.length > 0) && (
            <ProgressLog
              entries={regenLog}
              progress={regenProgress ?? undefined}
              isRunning={isRegenerating}
              maxH="200px"
            />
          )}

          {/* Детальный лог регенерации (live-обновление от main) */}
          {(isRegenerating || detailedLog.length > 0) && (
            <Box
              p={2}
              bg="bg.muted"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.subtle"
              fontFamily="mono"
              fontSize="xs"
            >
              <HStack justify="space-between" mb={1} px={1}>
                <Text fontWeight={500} color="fg.muted">
                  Лог регенерации ({detailedLog.length})
                </Text>
                {!isRegenerating && detailedLog.length > 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setDetailedLog([])
                      setCurrentStep(null)
                      void window.electronAPI?.animeManifest.resetRegenerationState()
                    }}
                  >
                    Очистить
                  </Button>
                )}
              </HStack>
              {/* Индикатор текущего шага — всегда виден над скролл-областью */}
              {isRegenerating && currentStep && (
                <Text px={1} mb={1} color="blue.400" fontWeight={500}>
                  ▶ {currentStep}
                </Text>
              )}
              <Box maxH="380px" overflowY="auto">
                <VStack gap={0.5} align="stretch">
                  {detailedLog.slice(-500).map((entry) => {
                    const color =
                      entry.level === 'error'
                        ? 'red.400'
                        : entry.level === 'warn'
                          ? 'orange.400'
                          : entry.level === 'success'
                            ? 'green.400'
                            : 'fg.muted'
                    return (
                      <Text key={entry.id} color={color} whiteSpace="pre-wrap" wordBreak="break-word">
                        {entry.message}
                      </Text>
                    )
                  })}
                </VStack>
              </Box>
            </Box>
          )}

          {/* Ошибка: нет места на диске */}
          {diskFullError && !isRegenerating && (
            <Box p={3} bg="red.subtle" borderRadius="md">
              <HStack gap={2}>
                <Icon as={LuTriangleAlert} color="red.fg" flexShrink={0} />
                <Text fontSize="sm" fontWeight={500} color="red.fg">
                  Нет места на диске — регенерация остановлена. Освободите место и возобновите с чекпоинта.
                </Text>
              </HStack>
            </Box>
          )}

          {/* Итог регенерации */}
          {regenResult && !isRegenerating && (
            <Box p={3} bg={regenResult.failed > 0 ? 'orange.subtle' : 'green.subtle'} borderRadius="md">
              <Text fontSize="sm" fontWeight={500} color={regenResult.failed > 0 ? 'orange.fg' : 'green.fg'}>
                Готово: {regenResult.success} успешно{regenResult.failed > 0 && `, ${regenResult.failed} ошибок`}
              </Text>
            </Box>
          )}

          {/* Сводка по целостности контента */}
          {healthSummary && !isRegenerating && (
            <Box p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px" borderColor="border.subtle">
              <Text fontSize="xs" color="fg.muted" mb={2}>
                Целостность контента после регенерации
              </Text>
              <HStack gap={3} flexWrap="wrap">
                <Text fontSize="sm">
                  <Text as="span" color="green.fg" fontWeight={500}>
                    ✅ {healthSummary.complete}
                  </Text>{' '}
                  полных
                </Text>
                {healthSummary.degraded > 0 && (
                  <Text fontSize="sm">
                    <Text as="span" color="orange.fg" fontWeight={500}>
                      ⚠️ {healthSummary.degraded}
                    </Text>{' '}
                    неполных (без скринов/шрифтов)
                  </Text>
                )}
                {healthSummary.broken > 0 && (
                  <Text fontSize="sm">
                    <Text as="span" color="red.fg" fontWeight={500}>
                      ❌ {healthSummary.broken}
                    </Text>{' '}
                    повреждённых (нет видео/аудио)
                  </Text>
                )}
                {(healthSummary.degraded > 0 || healthSummary.broken > 0) && (
                  <Button size="xs" variant="outline" onClick={handleShowDegraded}>
                    Подробнее
                  </Button>
                )}
              </HStack>
            </Box>
          )}

          {/* Диалог со списком degraded/broken аниме */}
          {showDegradedDialog && (
            <Box
              p={3}
              bg="bg.subtle"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.subtle"
              maxH="320px"
              overflowY="auto"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight={500} color="fg.muted">
                  Аниме с потерями ({degradedList.length})
                </Text>
                <Button size="xs" variant="ghost" onClick={() => setShowDegradedDialog(false)}>
                  Закрыть
                </Button>
              </HStack>
              <VStack gap={1} align="stretch">
                {degradedList.map((a) => {
                  const missingCids = a.missingCidsJson
                    ? (JSON.parse(a.missingCidsJson) as Array<{
                        kind: string
                        episodeNumber?: number
                        detail?: string
                      }>)
                    : []
                  const missingFonts = a.missingFontsJson
                    ? (JSON.parse(a.missingFontsJson) as Array<{ episodeNumber: number; fileExt: string }>)
                    : []
                  const colorPalette = a.contentHealth === 'broken' ? 'red' : 'orange'
                  return (
                    <Box
                      key={a.id}
                      p={2}
                      borderRadius="sm"
                      bg="bg.muted"
                      borderLeft="3px solid"
                      borderColor={`${colorPalette}.500`}
                    >
                      <Text fontSize="sm" fontWeight={500}>
                        {a.contentHealth === 'broken' ? '❌' : '⚠️'} {a.name}
                      </Text>
                      {missingCids.length > 0 && (
                        <Text fontSize="xs" color="fg.muted" mt={1}>
                          Потеряно CID:{' '}
                          {missingCids
                            .map((m) => `${m.kind}${m.episodeNumber ? ` (эп.${m.episodeNumber})` : ''}`)
                            .join(', ')}
                        </Text>
                      )}
                      {missingFonts.length > 0 && (
                        <Text fontSize="xs" color="fg.muted" mt={1}>
                          Потеряно шрифтов: {missingFonts.length} (эп.{' '}
                          {[...new Set(missingFonts.map((f) => f.episodeNumber))].join(', ')})
                        </Text>
                      )}
                    </Box>
                  )
                })}
              </VStack>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  )
}
