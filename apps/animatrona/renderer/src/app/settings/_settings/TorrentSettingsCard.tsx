'use client'

/**
 * Карточка настроек торрент-клиента
 *
 * Целевой ratio, папка скачивания, последовательная загрузка.
 * Настройки сохраняются в localStorage.
 */

import { Box, Button, Card, Checkbox, Heading, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowUpDown, LuFolderOpen } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

/** Ключ localStorage */
const STORAGE_KEY = 'animatrona:torrent-settings'

/** Настройки торрент-клиента */
export interface TorrentSettings {
  /** Целевой ratio для авто-остановки сидирования (0 = без лимита) */
  targetRatio: number
  /** Папка скачивания по умолчанию (пустая = Downloads/Animatrona) */
  downloadPath: string
  /** Последовательная загрузка по умолчанию */
  sequential: boolean
}

const DEFAULT_SETTINGS: TorrentSettings = {
  targetRatio: 2.0,
  downloadPath: '',
  sequential: false,
}

/** Загрузить настройки из localStorage */
export function loadTorrentSettings(): TorrentSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Игнорируем ошибки парсинга
  }
  return DEFAULT_SETTINGS
}

/** Сохранить настройки в localStorage */
function saveTorrentSettings(settings: TorrentSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Карточка настроек торрент-клиента
 */
export function TorrentSettingsCard() {
  const [settings, setSettings] = useState<TorrentSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(loadTorrentSettings())
  }, [])

  const handleSave = useCallback(
    (field: keyof TorrentSettings, value: unknown) => {
      const updated = { ...settings, [field]: value }
      setSettings(updated)
      saveTorrentSettings(updated)
      toaster.success({ title: 'Настройки торрента сохранены' })
    },
    [settings]
  )

  const handleSelectFolder = useCallback(async () => {
    const folder = await window.electronAPI?.dialog.selectFolder()
    if (folder) {
      handleSave('downloadPath', folder)
    }
  }, [handleSave])

  const handleResetPath = useCallback(() => {
    handleSave('downloadPath', '')
  }, [handleSave])

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">
          <HStack>
            <Icon>
              <LuArrowUpDown />
            </Icon>
            <Text>Торрент-клиент</Text>
          </HStack>
        </Heading>
      </Card.Header>
      <Card.Body>
        <VStack gap={5} align="stretch">
          {/* Целевой ratio */}
          <Box>
            <Text fontWeight="medium" mb={1}>
              Целевой ratio
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Сидирование остановится при достижении этого ratio. 0 — без лимита.
            </Text>
            <HStack gap={2}>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.targetRatio}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val >= 0) {
                    handleSave('targetRatio', val)
                  }
                }}
                maxW="120px"
              />
              <Text fontSize="sm" color="fg.muted">
                Рекомендуется ≥ 2.0
              </Text>
            </HStack>
          </Box>

          {/* Папка скачивания */}
          <Box>
            <Text fontWeight="medium" mb={1}>
              Папка скачивания
            </Text>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Папка по умолчанию для скачивания торрентов. Пустое значение — Downloads/Animatrona.
            </Text>
            <HStack gap={2}>
              <Input value={settings.downloadPath} placeholder="По умолчанию: Downloads/Animatrona" readOnly flex={1} />
              <Button variant="outline" size="sm" onClick={handleSelectFolder}>
                <Icon>
                  <LuFolderOpen />
                </Icon>
                Выбрать
              </Button>
              {settings.downloadPath && (
                <Button variant="ghost" size="sm" onClick={handleResetPath}>
                  Сбросить
                </Button>
              )}
            </HStack>
          </Box>

          {/* Последовательная загрузка */}
          <Box>
            <Checkbox.Root checked={settings.sequential} onCheckedChange={(e) => handleSave('sequential', !!e.checked)}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <VStack align="start" gap={0}>
                <Text fontWeight="medium">Последовательная загрузка</Text>
                <Text fontSize="xs" color="fg.muted">
                  Скачивать файлы по порядку (полезно для стриминга во время скачивания)
                </Text>
              </VStack>
            </Checkbox.Root>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
