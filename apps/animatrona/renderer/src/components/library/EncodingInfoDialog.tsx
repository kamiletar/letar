'use client'

/**
 * Диалог просмотра настроек кодирования эпизода
 * Загружает данные из IPFS через manifest:getEncoding IPC
 */

import {
  Badge,
  Box,
  Button,
  CloseButton,
  Code,
  DataList,
  Dialog,
  HStack,
  Icon,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  LuClipboard,
  LuClock,
  LuCpu,
  LuFileVideo,
  LuHardDrive,
  LuLayers,
  LuMonitor,
  LuPercent,
  LuSettings2,
  LuTarget,
  LuTerminal,
  LuVideo,
} from 'react-icons/lu'

import { formatBytes, formatDurationMs } from '@/lib/format-utils'
import type { ManifestEncodingInfo } from '@/types/electron'

interface EncodingInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeNumber: number
  manifestCid: string
  /** CID metadata.json исходника в IPFS */
  metadataCid?: string | null
}

/** Цвет для CQ значения */
function getCqColor(cq: number): string {
  if (cq <= 22) {
    return 'green.400'
  }
  if (cq <= 28) {
    return 'yellow.400'
  }
  if (cq <= 32) {
    return 'orange.400'
  }
  return 'red.400'
}

/** Описание качества по CQ */
function getCqQuality(cq: number): string {
  if (cq <= 18) {
    return 'Эталонное'
  }
  if (cq <= 22) {
    return 'Высокое'
  }
  if (cq <= 26) {
    return 'Хорошее'
  }
  if (cq <= 30) {
    return 'Среднее'
  }
  if (cq <= 34) {
    return 'Сжатое'
  }
  return 'Низкое'
}

/** Секция с иконкой и заголовком для группировки DataList */
function EncodingSection({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ComponentType
  color: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Box>
      <HStack mb={2}>
        <Icon as={icon} color={color} boxSize={4} />
        <Text fontWeight="semibold" fontSize="sm">
          {title}
        </Text>
      </HStack>
      {children}
    </Box>
  )
}

/**
 * Диалог с информацией о кодировании эпизода
 * Лениво загружает данные из IPFS при открытии
 */
export function EncodingInfoDialog({
  open,
  onOpenChange,
  episodeNumber,
  manifestCid,
  metadataCid,
}: EncodingInfoDialogProps) {
  const [settings, setSettings] = useState<ManifestEncodingInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Медиаинфо исходника
  const [mediaInfoOpen, setMediaInfoOpen] = useState(false)
  const [mediaInfo, setMediaInfo] = useState<Record<string, unknown> | null>(null)
  const [mediaInfoLoading, setMediaInfoLoading] = useState(false)
  const [mediaInfoError, setMediaInfoError] = useState<string | null>(null)

  // Загрузка данных из IPFS при открытии диалога
  useEffect(() => {
    if (!open || !manifestCid || !window.electronAPI) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    window.electronAPI.manifest
      .getEncoding(manifestCid)
      .then((result) => {
        if (cancelled) {
          return
        }
        if (result.success && result.data) {
          setSettings(result.data)
        } else {
          setSettings(null)
          setError(result.error ?? null)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, manifestCid])

  // Расчёт экономии
  const sourceSize = settings?.sourceSize ?? null
  const transcodedSize = settings?.transcodedSize ?? null
  const savings = sourceSize && transcodedSize ? (((sourceSize - transcodedSize) / sourceSize) * 100).toFixed(1) : null

  const handleCopyCommand = useCallback(() => {
    if (settings?.ffmpegCommand) {
      navigator.clipboard.writeText(settings.ffmpegCommand)
    }
  }, [settings?.ffmpegCommand])

  // Загрузка медиаинфо исходника из IPFS
  const handleShowMediaInfo = useCallback(async () => {
    if (!metadataCid || !window.electronAPI) {
      return
    }

    setMediaInfoOpen(true)
    setMediaInfoLoading(true)
    setMediaInfoError(null)

    try {
      const gatewayResult = await window.electronAPI.kubo.getGatewayUrl()
      if (!gatewayResult.success || !gatewayResult.data) {
        setMediaInfoError('IPFS Gateway недоступен')
        return
      }

      const res = await fetch(`${gatewayResult.data}/ipfs/${metadataCid}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        setMediaInfoError(`Ошибка загрузки: ${res.status}`)
        return
      }

      const data = await res.json()
      setMediaInfo(data)
    } catch (err) {
      setMediaInfoError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setMediaInfoLoading(false)
    }
  }, [metadataCid])

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="480px">
              <Dialog.Header>
                <Dialog.Title>
                  <HStack>
                    <Icon as={LuSettings2} color="purple.400" />
                    <Text>Настройки кодирования</Text>
                  </HStack>
                </Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
              </Dialog.Header>

              <Dialog.Body>
                <VStack gap={6} align="stretch">
                  {/* Заголовок эпизода */}
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <Text fontWeight="bold" fontSize="lg">
                      Эпизод {episodeNumber}
                    </Text>
                    {settings?.profileName && (
                      <Text color="fg.muted" fontSize="sm">
                        Профиль: {settings.profileName}
                      </Text>
                    )}
                  </Box>

                  {/* Загрузка */}
                  {loading && (
                    <Box p={4} textAlign="center">
                      <Spinner size="lg" color="purple.500" />
                      <Text color="fg.muted" mt={2} fontSize="sm">
                        Загрузка из IPFS...
                      </Text>
                    </Box>
                  )}

                  {/* Ошибка */}
                  {!loading && error && (
                    <Box p={4} bg="bg.subtle" borderRadius="md" textAlign="center">
                      <Text color="fg.subtle">Ошибка загрузки данных</Text>
                      <Text color="fg.subtle" fontSize="sm">
                        {error}
                      </Text>
                    </Box>
                  )}

                  {/* Нет данных */}
                  {!loading && !error && !settings && (
                    <Box p={4} bg="bg.subtle" borderRadius="md" textAlign="center">
                      <Text color="fg.subtle">Нет данных о кодировании</Text>
                      <Text color="fg.subtle" fontSize="sm">
                        Эпизод был импортирован до версии v0.9.0
                      </Text>
                    </Box>
                  )}

                  {!loading && settings && (
                    <>
                      {/* Основные параметры */}
                      <EncodingSection icon={LuVideo} color="purple.400" title="Параметры кодирования">
                        <DataList.Root size="sm">
                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">Кодек</DataList.ItemLabel>
                            <DataList.ItemValue>
                              <Badge colorPalette="purple">{settings.codec?.toUpperCase() ?? '—'}</Badge>
                            </DataList.ItemValue>
                          </DataList.Item>

                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">CQ/QP</DataList.ItemLabel>
                            <DataList.ItemValue>
                              <HStack>
                                <Text fontWeight="bold" color={settings.cq ? getCqColor(settings.cq) : undefined}>
                                  {settings.cq ?? '—'}
                                </Text>
                                {settings.cq && (
                                  <Badge colorPalette="gray" size="sm">
                                    {getCqQuality(settings.cq)}
                                  </Badge>
                                )}
                              </HStack>
                            </DataList.ItemValue>
                          </DataList.Item>

                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">Preset</DataList.ItemLabel>
                            <DataList.ItemValue>{settings.preset ?? '—'}</DataList.ItemValue>
                          </DataList.Item>

                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">Rate Control</DataList.ItemLabel>
                            <DataList.ItemValue>{settings.rateControl ?? '—'}</DataList.ItemValue>
                          </DataList.Item>

                          {settings.tune && (
                            <DataList.Item>
                              <DataList.ItemLabel color="fg.muted">Tune</DataList.ItemLabel>
                              <DataList.ItemValue>{settings.tune}</DataList.ItemValue>
                            </DataList.Item>
                          )}
                        </DataList.Root>
                      </EncodingSection>

                      {/* Расширенные настройки */}
                      <EncodingSection icon={LuCpu} color="cyan.400" title="Расширенные">
                        <DataList.Root size="sm">
                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">Spatial AQ</DataList.ItemLabel>
                            <DataList.ItemValue>
                              <Badge colorPalette={settings.spatialAq ? 'green' : 'gray'}>
                                {settings.spatialAq ? 'Вкл' : 'Выкл'}
                              </Badge>
                            </DataList.ItemValue>
                          </DataList.Item>

                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">Temporal AQ</DataList.ItemLabel>
                            <DataList.ItemValue>
                              <Badge colorPalette={settings.temporalAq ? 'green' : 'gray'}>
                                {settings.temporalAq ? 'Вкл' : 'Выкл'}
                              </Badge>
                            </DataList.ItemValue>
                          </DataList.Item>

                          {settings.aqStrength !== undefined && (
                            <DataList.Item>
                              <DataList.ItemLabel color="fg.muted">AQ Strength</DataList.ItemLabel>
                              <DataList.ItemValue>{settings.aqStrength}</DataList.ItemValue>
                            </DataList.Item>
                          )}

                          {settings.gopSize !== undefined && (
                            <DataList.Item>
                              <DataList.ItemLabel color="fg.muted">GOP Size</DataList.ItemLabel>
                              <DataList.ItemValue>{settings.gopSize}</DataList.ItemValue>
                            </DataList.Item>
                          )}

                          {settings.lookahead !== undefined && (
                            <DataList.Item>
                              <DataList.ItemLabel color="fg.muted">Lookahead</DataList.ItemLabel>
                              <DataList.ItemValue>{settings.lookahead}</DataList.ItemValue>
                            </DataList.Item>
                          )}

                          <DataList.Item>
                            <DataList.ItemLabel color="fg.muted">10-bit</DataList.ItemLabel>
                            <DataList.ItemValue>
                              <Badge colorPalette={settings.force10Bit ? 'purple' : 'gray'}>
                                {settings.force10Bit ? 'Да' : 'Нет'}
                              </Badge>
                            </DataList.ItemValue>
                          </DataList.Item>
                        </DataList.Root>
                      </EncodingSection>

                      {/* Энкодер и VMAF */}
                      {(settings.encoderType
                        || settings.vmafScore !== undefined
                        || settings.transcodeDurationMs !== undefined
                        || settings.activeGpuWorkers !== undefined) && (
                        <EncodingSection
                          icon={settings.encoderType === 'cpu' ? LuCpu : LuMonitor}
                          color="blue.400"
                          title="Энкодер"
                        >
                          <DataList.Root size="sm">
                            {settings.encoderType && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Тип</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Badge colorPalette={settings.encoderType === 'gpu' ? 'purple' : 'blue'}>
                                    {settings.encoderType === 'gpu' ? 'GPU (NVENC)' : 'CPU (libsvtav1)'}
                                  </Badge>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.hardwareModel && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Оборудование</DataList.ItemLabel>
                                <DataList.ItemValue>{settings.hardwareModel}</DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.vmafScore !== undefined && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">
                                  <HStack gap={1}>
                                    <Icon as={LuTarget} boxSize={3} />
                                    <Text>VMAF</Text>
                                  </HStack>
                                </DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Text fontWeight="bold" color="green.400">
                                    {settings.vmafScore.toFixed(1)}
                                  </Text>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.ffmpegVersion && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">FFmpeg</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Text fontSize="sm">{settings.ffmpegVersion}</Text>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.transcodeDurationMs !== undefined && settings.transcodeDurationMs > 0 && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">
                                  <HStack gap={1}>
                                    <Icon as={LuClock} boxSize={3} />
                                    <Text>Время кодирования</Text>
                                  </HStack>
                                </DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Text fontWeight="bold" color="cyan.400">
                                    {formatDurationMs(settings.transcodeDurationMs)}
                                  </Text>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.activeGpuWorkers !== undefined && settings.activeGpuWorkers > 0 && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">
                                  <HStack gap={1}>
                                    <Icon as={LuLayers} boxSize={3} />
                                    <Text>GPU потоки</Text>
                                  </HStack>
                                </DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Badge colorPalette={settings.activeGpuWorkers > 1 ? 'purple' : 'gray'}>
                                    {settings.activeGpuWorkers} {settings.activeGpuWorkers > 1 ? '(Dual Encoder)' : ''}
                                  </Badge>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {(settings.videoMaxConcurrent !== undefined
                              || settings.audioMaxConcurrent !== undefined) && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Лимиты потоков</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <HStack gap={2}>
                                    {settings.videoMaxConcurrent !== undefined && (
                                      <Badge colorPalette="purple" size="sm">
                                        GPU: {settings.videoMaxConcurrent}
                                      </Badge>
                                    )}
                                    {settings.audioMaxConcurrent !== undefined && (
                                      <Badge colorPalette="cyan" size="sm">
                                        CPU: {settings.audioMaxConcurrent}
                                      </Badge>
                                    )}
                                  </HStack>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}
                          </DataList.Root>
                        </EncodingSection>
                      )}

                      {/* Исходное видео */}
                      {(settings.sourceCodec
                        || settings.sourceWidth
                        || settings.sourceBitrate
                        || settings.sourceBitDepth) && (
                        <EncodingSection icon={LuFileVideo} color="teal.400" title="Исходное видео">
                          <DataList.Root size="sm">
                            {settings.sourceCodec && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Кодек</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Badge colorPalette="teal">{settings.sourceCodec.toUpperCase()}</Badge>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.sourceWidth && settings.sourceHeight && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Разрешение</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {settings.sourceWidth}×{settings.sourceHeight}
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.sourceBitrate && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Битрейт</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  {(settings.sourceBitrate / 1_000_000).toFixed(1)} Mbps
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {settings.sourceBitDepth && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Битность</DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Badge colorPalette={settings.sourceBitDepth >= 10 ? 'purple' : 'gray'}>
                                    {settings.sourceBitDepth}-bit
                                  </Badge>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}
                          </DataList.Root>
                        </EncodingSection>
                      )}

                      {/* FFmpeg команда */}
                      {settings.ffmpegCommand && (
                        <Box>
                          <HStack mb={2} justify="space-between">
                            <HStack>
                              <Icon as={LuTerminal} color="orange.400" boxSize={4} />
                              <Text fontWeight="semibold" fontSize="sm">
                                FFmpeg команда
                              </Text>
                            </HStack>
                            <Button size="xs" variant="ghost" onClick={handleCopyCommand}>
                              <Icon as={LuClipboard} boxSize={3} mr={1} />
                              Копировать
                            </Button>
                          </HStack>
                          <Code
                            display="block"
                            p={2}
                            bg="bg.subtle"
                            borderRadius="md"
                            fontSize="xs"
                            whiteSpace="pre-wrap"
                            wordBreak="break-all"
                            maxH="120px"
                            overflow="auto"
                          >
                            {settings.ffmpegCommand}
                          </Code>
                        </Box>
                      )}

                      {/* Размеры файлов */}
                      {(sourceSize || transcodedSize) && (
                        <EncodingSection icon={LuHardDrive} color="green.400" title="Размеры файлов">
                          <DataList.Root size="sm">
                            {sourceSize && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">Исходный</DataList.ItemLabel>
                                <DataList.ItemValue>{formatBytes(sourceSize)}</DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {transcodedSize && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">После кодирования</DataList.ItemLabel>
                                <DataList.ItemValue>{formatBytes(transcodedSize)}</DataList.ItemValue>
                              </DataList.Item>
                            )}

                            {savings && (
                              <DataList.Item>
                                <DataList.ItemLabel color="fg.muted">
                                  <HStack gap={1}>
                                    <Icon as={LuPercent} boxSize={3} />
                                    <Text>Экономия</Text>
                                  </HStack>
                                </DataList.ItemLabel>
                                <DataList.ItemValue>
                                  <Text
                                    fontWeight="bold"
                                    color={Number(savings) > 50
                                      ? 'green.400'
                                      : Number(savings) > 30
                                      ? 'yellow.400'
                                      : 'orange.400'}
                                  >
                                    {savings}%
                                  </Text>
                                </DataList.ItemValue>
                              </DataList.Item>
                            )}
                          </DataList.Root>
                        </EncodingSection>
                      )}
                    </>
                  )}
                </VStack>
              </Dialog.Body>

              <Dialog.Footer justifyContent="space-between">
                {metadataCid
                  ? (
                    <Button variant="outline" size="sm" onClick={handleShowMediaInfo}>
                      <Icon as={LuFileVideo} mr={1} />
                      Медиаинфо исходника
                    </Button>
                  )
                  : <Box />}
                <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог медиаинфо исходника */}
      <Dialog.Root open={mediaInfoOpen} onOpenChange={(e) => setMediaInfoOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="600px" maxH="80vh">
              <Dialog.Header>
                <Dialog.Title>
                  <HStack>
                    <Icon as={LuFileVideo} color="teal.400" />
                    <Text>Медиаинфо исходника — Эпизод {episodeNumber}</Text>
                  </HStack>
                </Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
              </Dialog.Header>

              <Dialog.Body overflow="auto">
                {mediaInfoLoading && (
                  <Box p={4} textAlign="center">
                    <Spinner size="lg" color="teal.500" />
                    <Text color="fg.muted" mt={2} fontSize="sm">
                      Загрузка из IPFS...
                    </Text>
                  </Box>
                )}

                {!mediaInfoLoading && mediaInfoError && (
                  <Box p={4} bg="bg.subtle" borderRadius="md" textAlign="center">
                    <Text color="fg.subtle">{mediaInfoError}</Text>
                  </Box>
                )}

                {!mediaInfoLoading && mediaInfo && (
                  <Code
                    display="block"
                    p={3}
                    bg="bg.subtle"
                    borderRadius="md"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    wordBreak="break-all"
                    overflow="auto"
                  >
                    {JSON.stringify(mediaInfo, null, 2)}
                  </Code>
                )}
              </Dialog.Body>

              <Dialog.Footer>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (mediaInfo) {
                      navigator.clipboard.writeText(JSON.stringify(mediaInfo, null, 2))
                    }
                  }}
                  disabled={!mediaInfo}
                >
                  <Icon as={LuClipboard} mr={1} />
                  Копировать
                </Button>
                <Button onClick={() => setMediaInfoOpen(false)}>Закрыть</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
