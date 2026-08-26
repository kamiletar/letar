'use client'

/**
 * Карточка настроек библиотеки (папки)
 */

import { Box, Button, Card, Heading, HStack, Separator, Slider, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuDatabase, LuFolderOpen, LuTrash2, LuTruck } from 'react-icons/lu'

import { LibraryMigrationDialog } from '@/components/settings/LibraryMigrationDialog'
import { toaster } from '@/components/ui/toaster'
import type { Settings } from '@/generated/prisma'

import type { DefaultPaths } from './types'

interface LibrarySettingsCardProps {
  settings: Settings | null | undefined
  defaultPaths: DefaultPaths | null
  onSave: (field: string, value: unknown) => void
}

/**
 * Настройки библиотеки (папки хранения)
 */
export function LibrarySettingsCard({ settings, defaultPaths, onSave }: LibrarySettingsCardProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [storageMaxGb, setStorageMaxGb] = useState(settings?.ipfsStorageMaxGb ?? 500)

  /** Вычисляет путь к IPFS хранилищу */
  const ipfsPath = settings?.libraryPath ? `${settings.libraryPath}/ipfs` : '(legacy: userData/kubo-repo)'

  const handleSelectFolder = async (field: 'libraryPath' | 'outputPath') => {
    const folder = await window.electronAPI?.dialog.selectFolder()
    if (folder) {
      onSave(field, folder)
    }
  }

  /** Форматирование размера файла */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Б'
    }
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleClearLibrary = async () => {
    if (confirmText !== 'УДАЛИТЬ') {
      toaster.error({ title: 'Введите "УДАЛИТЬ" для подтверждения' })
      return
    }

    setIsClearing(true)
    try {
      const result = await window.electronAPI?.ipfs?.publisherClearLibrary()
      if (result?.success) {
        const deletedCount = result.data?.deletedCount ?? 0
        const deletedBytes = result.data?.deletedBytes ?? 0
        toaster.success({
          title: 'Библиотека очищена',
          description: `Удалено ${deletedCount} аниме из БД, освобождено ${formatBytes(deletedBytes)} в IPFS`,
        })
        setConfirmText('')
        // Перезагрузить страницу для обновления данных
        window.location.reload()
      } else {
        toaster.error({ title: 'Ошибка', description: result?.error || 'Не удалось очистить библиотеку' })
      }
    } catch (error) {
      toaster.error({ title: 'Ошибка', description: String(error) })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuFolderOpen size={20} color="var(--chakra-colors-purple-400)" />
          <Heading size="md">Библиотека</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Папка библиотеки */}
          <Box>
            <Text fontSize="sm" color="fg.subtle" mb={2}>
              Папка библиотеки
            </Text>
            <HStack>
              <Box flex={1} p={3} bg="bg.subtle" borderRadius="md">
                {settings?.libraryPath ? <Text color="fg">{settings.libraryPath}</Text> : (
                  <VStack align="start" gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      {defaultPaths?.libraryPath || 'Загрузка...'}
                    </Text>
                    <Text color="fg.subtle" fontSize="xs">
                      (по умолчанию)
                    </Text>
                  </VStack>
                )}
              </Box>
              <Button variant="outline" onClick={() => handleSelectFolder('libraryPath')}>
                Выбрать
              </Button>
            </HStack>
          </Box>

          {/* Папка транскодирования */}
          <Box>
            <Text fontSize="sm" color="fg.subtle" mb={2}>
              Папка для транскодирования
            </Text>
            <HStack>
              <Box flex={1} p={3} bg="bg.subtle" borderRadius="md">
                {settings?.outputPath ? <Text color="fg">{settings.outputPath}</Text> : (
                  <VStack align="start" gap={0}>
                    <Text color="fg.muted" fontSize="sm">
                      {defaultPaths?.outputPath || 'Загрузка...'}
                    </Text>
                    <Text color="fg.subtle" fontSize="xs">
                      (по умолчанию)
                    </Text>
                  </VStack>
                )}
              </Box>
              <Button variant="outline" onClick={() => handleSelectFolder('outputPath')}>
                Выбрать
              </Button>
            </HStack>
          </Box>

          <Separator />

          {/* IPFS хранилище */}
          <Box>
            <HStack gap={3} mb={3}>
              <LuDatabase size={16} color="var(--chakra-colors-cyan-400)" />
              <Text fontSize="sm" fontWeight="medium">
                IPFS хранилище
              </Text>
            </HStack>
            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="xs" color="fg.subtle" mb={1}>
                  Путь к хранилищу
                </Text>
                <Box p={2} bg="bg.subtle" borderRadius="md">
                  <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                    {ipfsPath}
                  </Text>
                </Box>
              </Box>

              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="fg.subtle">
                    Максимальный размер
                  </Text>
                  <Text fontSize="xs" color="fg" fontWeight="medium">
                    {storageMaxGb} ГБ
                  </Text>
                </HStack>
                <Slider.Root
                  min={10}
                  max={4000}
                  step={10}
                  value={[storageMaxGb]}
                  onValueChange={({ value }) => setStorageMaxGb(value[0])}
                  onValueChangeEnd={({ value }) => {
                    onSave('ipfsStorageMaxGb', value[0])
                    toaster.info({
                      title: 'Размер IPFS обновлён',
                      description: `${value[0]} ГБ — применится при следующем запуске`,
                    })
                  }}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} />
                  </Slider.Control>
                </Slider.Root>
                <Text fontSize="xs" color="fg.subtle" mt={1}>
                  Применится при следующем запуске приложения
                </Text>
              </Box>

              <Button variant="outline" size="sm" alignSelf="start" onClick={() => setMigrationOpen(true)}>
                <LuTruck size={16} />
                Перенести библиотеку...
              </Button>
            </VStack>
          </Box>

          <LibraryMigrationDialog
            open={migrationOpen}
            onOpenChange={setMigrationOpen}
            currentLibraryPath={settings?.libraryPath ?? null}
          />

          <Separator />

          {/* Очистка библиотеки */}
          <Box>
            <HStack gap={3} mb={2}>
              <LuTrash2 size={16} color="var(--chakra-colors-red-400)" />
              <Text fontSize="sm" fontWeight="medium" color="red.400">
                Опасная зона
              </Text>
            </HStack>
            <Box p={4} bg="red.subtle" borderRadius="md" borderWidth="1px" borderColor="red.muted">
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" color="red.fg">
                  Очистить библиотеку — удалить все записи из БД и весь контент из IPFS. Файлы на диске НЕ удаляются.
                </Text>
                <HStack>
                  <Box flex={1}>
                    <input
                      type="text"
                      placeholder='Введите "УДАЛИТЬ" для подтверждения'
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--chakra-colors-border-subtle)',
                        background: 'var(--chakra-colors-bg)',
                        color: 'var(--chakra-colors-fg)',
                        fontSize: '14px',
                      }}
                    />
                  </Box>
                  <Button
                    colorPalette="red"
                    size="sm"
                    onClick={handleClearLibrary}
                    loading={isClearing}
                    disabled={confirmText !== 'УДАЛИТЬ'}
                  >
                    Очистить библиотеку
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
