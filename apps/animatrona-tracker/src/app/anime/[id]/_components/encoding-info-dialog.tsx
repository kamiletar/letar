'use client'

/**
 * Диалог информации о кодировании эпизода (трекер-версия)
 *
 * Загружает episode manifest из IPFS через gateway (не IPC как на десктопе).
 * Показывает: кодек, разрешение, CQ, preset, размеры, encoder.
 */

import { getIpfsUrl } from '@/lib/ipfs'
import { Box, CloseButton, DataList, Dialog, HStack, Icon, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCpu, LuInfo, LuMonitor, LuVideo } from 'react-icons/lu'

interface EncodingInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeNumber: number
  /** CID директории аниме в IPFS */
  directoryCid: string
}

/** Данные кодирования из IPFS episode manifest */
interface EncodingData {
  profileName?: string
  codec?: string
  cq?: number
  preset?: string
  rateControl?: string
  force10Bit?: boolean
  encoderType?: 'gpu' | 'cpu'
  hardwareModel?: string
  sourceSize?: number
  transcodedSize?: number
  compressionRatio?: number
  sourceCodec?: string
  sourceWidth?: number
  sourceHeight?: number
  sourceBitrate?: number
  transcodeDurationMs?: number
}

/** Форматирование размера файла */
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / 1024).toFixed(0)} KB`
}

export function EncodingInfoDialog({ open, onOpenChange, episodeNumber, directoryCid }: EncodingInfoDialogProps) {
  const [data, setData] = useState<EncodingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEncoding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Загружаем episode manifest из IPFS
      const url = getIpfsUrl(`${directoryCid}/episodes/${episodeNumber}/manifest.json`)
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const manifest = await res.json()
      setData(manifest.encoding ?? null)
      if (!manifest.encoding) {
        setError('Данные кодирования отсутствуют')
      }
    } catch {
      setError('Не удалось загрузить данные из IPFS')
    } finally {
      setLoading(false)
    }
  }, [directoryCid, episodeNumber])

  useEffect(() => {
    if (open && !data && !loading) {
      loadEncoding()
    }
  }, [open, data, loading, loadEncoding])

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <HStack gap={2}>
                <Icon as={LuInfo} />
                <Dialog.Title>Эпизод {episodeNumber} — Кодирование</Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              {loading && (
                <VStack py={8}>
                  <Spinner size="lg" />
                  <Text color="fg.muted">Загрузка из IPFS...</Text>
                </VStack>
              )}

              {error && !loading && (
                <Box py={8} textAlign="center">
                  <Text color="fg.muted">{error}</Text>
                </Box>
              )}

              {data && !loading && (
                <DataList.Root orientation="horizontal" divideY="1px">
                  {/* Видео */}
                  {data.codec && (
                    <DataList.Item>
                      <DataList.ItemLabel>
                        <HStack gap={1}>
                          <Icon as={LuVideo} boxSize={3} />
                          <Text>Кодек</Text>
                        </HStack>
                      </DataList.ItemLabel>
                      <DataList.ItemValue>
                        {data.codec.toUpperCase()}
                        {data.force10Bit ? ' 10-bit' : ''}
                      </DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.sourceWidth && data.sourceHeight && (
                    <DataList.Item>
                      <DataList.ItemLabel>
                        <HStack gap={1}>
                          <Icon as={LuMonitor} boxSize={3} />
                          <Text>Разрешение</Text>
                        </HStack>
                      </DataList.ItemLabel>
                      <DataList.ItemValue>
                        {data.sourceWidth}x{data.sourceHeight}
                      </DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.cq !== undefined && (
                    <DataList.Item>
                      <DataList.ItemLabel>CQ</DataList.ItemLabel>
                      <DataList.ItemValue>{data.cq}</DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.preset && (
                    <DataList.Item>
                      <DataList.ItemLabel>Preset</DataList.ItemLabel>
                      <DataList.ItemValue>{data.preset}</DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.profileName && (
                    <DataList.Item>
                      <DataList.ItemLabel>Профиль</DataList.ItemLabel>
                      <DataList.ItemValue>{data.profileName}</DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {/* Encoder */}
                  {data.encoderType && (
                    <DataList.Item>
                      <DataList.ItemLabel>
                        <HStack gap={1}>
                          <Icon as={LuCpu} boxSize={3} />
                          <Text>Encoder</Text>
                        </HStack>
                      </DataList.ItemLabel>
                      <DataList.ItemValue>
                        {data.encoderType.toUpperCase()}
                        {data.hardwareModel ? ` (${data.hardwareModel})` : ''}
                      </DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {/* Размеры */}
                  {data.sourceSize && (
                    <DataList.Item>
                      <DataList.ItemLabel>Исходник</DataList.ItemLabel>
                      <DataList.ItemValue>
                        {formatSize(data.sourceSize)}
                        {data.sourceCodec ? ` (${data.sourceCodec})` : ''}
                      </DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.transcodedSize && (
                    <DataList.Item>
                      <DataList.ItemLabel>После кодирования</DataList.ItemLabel>
                      <DataList.ItemValue>
                        {formatSize(data.transcodedSize)}
                        {data.compressionRatio ? ` (×${data.compressionRatio.toFixed(1)})` : ''}
                      </DataList.ItemValue>
                    </DataList.Item>
                  )}

                  {data.transcodeDurationMs && (
                    <DataList.Item>
                      <DataList.ItemLabel>Время кодирования</DataList.ItemLabel>
                      <DataList.ItemValue>{Math.floor(data.transcodeDurationMs / 60000)} мин</DataList.ItemValue>
                    </DataList.Item>
                  )}
                </DataList.Root>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
