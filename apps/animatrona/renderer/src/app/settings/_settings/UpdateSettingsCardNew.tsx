/**
 * Улучшенная карточка настроек обновлений
 *
 * Интегрируется с новым Zustand store и предоставляет:
 * - Управление настройками автообновлений
 * - История обновлений
 * - Список пропущенных версий
 * - Текущий статус обновления
 */

'use client'

import { useUpdateStore } from '@/components/update'
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  Progress,
  Separator,
  Spinner,
  Stack,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCalendar, LuDownload, LuPlay, LuRefreshCw, LuX } from 'react-icons/lu'

/**
 * Настройки обновлений приложения (новая версия)
 */
export function UpdateSettingsCardNew() {
  const status = useUpdateStore((state) => state.status)
  const preferences = useUpdateStore((state) => state.preferences)
  const updatePreferences = useUpdateStore((state) => state.updatePreferences)
  const updateHistory = useUpdateStore((state) => state.updateHistory)
  const skippedVersions = useUpdateStore((state) => state.skippedVersions)
  const unskipVersion = useUpdateStore((state) => state.unskipVersion)
  const setDrawerOpen = useUpdateStore((state) => state.setDrawerOpen)

  const [appVersion, setAppVersion] = useState<string>('...')

  // Получить версию приложения
  useEffect(() => {
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.getVersion().then((version) => {
        if (version) {
          setAppVersion(version)
        }
      })
    }
  }, [])

  // Обработчики действий
  const handleCheckUpdates = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.check()
    }
  }

  const handleDownload = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.download()
    }
  }

  const handleInstall = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.install()
    }
  }

  const handleOpenDrawer = () => {
    setDrawerOpen(true)
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon fontSize="xl" color="purple.fg" asChild>
            <LuDownload />
          </Icon>
          <Heading size="md">Обновления</Heading>
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Текущая версия */}
          <HStack justify="space-between">
            <Text fontWeight="medium">Текущая версия</Text>
            <Badge colorPalette="purple" size="sm">
              v{appVersion}
            </Badge>
          </HStack>

          {/* Статус обновления */}
          {status.status === 'checking' && (
            <HStack gap={2} p={3} bg="bg.muted" borderRadius="md">
              <Spinner size="sm" />
              <Text color="fg.muted">Проверка обновлений...</Text>
            </HStack>
          )}

          {status.status === 'available' && status.updateInfo && (
            <Box p={3} bg="green.subtle" border="1px" borderColor="green.muted" borderRadius="md">
              <VStack gap={3} align="stretch">
                <HStack justify="space-between">
                  <VStack align="start" gap={0}>
                    <Text color="green.fg" fontWeight="medium">
                      Доступна новая версия!
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      v{status.updateInfo.version}
                    </Text>
                  </VStack>
                  <Button colorPalette="green" size="sm" onClick={handleDownload}>
                    <LuDownload />
                    Скачать
                  </Button>
                </HStack>
                <Button variant="ghost" size="sm" onClick={handleOpenDrawer}>
                  Посмотреть изменения
                </Button>
              </VStack>
            </Box>
          )}

          {status.status === 'downloading' && (
            <Box p={3} bg="bg.muted" borderRadius="md">
              <VStack gap={2} align="stretch">
                <HStack justify="space-between">
                  <Text color="fg.muted" fontSize="sm">
                    Загрузка обновления...
                  </Text>
                  <Text color="purple.fg" fontSize="sm" fontWeight="medium">
                    {status.downloadProgress.toFixed(0)}%
                  </Text>
                </HStack>
                <Progress.Root value={status.downloadProgress} colorPalette="purple" size="sm">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
                {status.downloadSpeed > 0 && (
                  <Text fontSize="xs" color="fg.muted">
                    {(status.downloadSpeed / 1024 / 1024).toFixed(1)} МБ/с
                    {status.downloadEta > 0 && ` • ~${Math.ceil(status.downloadEta)} сек`}
                  </Text>
                )}
              </VStack>
            </Box>
          )}

          {status.status === 'downloaded' && (
            <Box p={3} bg="purple.subtle" border="1px" borderColor="purple.muted" borderRadius="md">
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <Text color="purple.fg" fontWeight="medium">
                    Обновление готово к установке
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Перезапустите приложение для установки
                  </Text>
                </VStack>
                <Button colorPalette="purple" size="sm" onClick={handleInstall}>
                  <LuPlay />
                  Установить
                </Button>
              </HStack>
            </Box>
          )}

          {status.status === 'not-available' && (
            <Text color="fg.muted" fontSize="sm">
              У вас установлена последняя версия
            </Text>
          )}

          {status.status === 'error' && status.error && (
            <Box p={3} bg="red.subtle" border="1px" borderColor="red.muted" borderRadius="md">
              <Text color="red.fg" fontSize="sm">
                Ошибка: {status.error}
              </Text>
            </Box>
          )}

          {/* Кнопка проверки */}
          {(status.status === 'idle' || status.status === 'not-available' || status.status === 'error') && (
            <Button variant="outline" size="sm" onClick={handleCheckUpdates} alignSelf="flex-start">
              <LuRefreshCw />
              Проверить обновления
            </Button>
          )}

          <Separator />

          {/* Настройки автообновлений */}
          <Stack gap={3}>
            <Heading size="sm">Настройки</Heading>

            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium">
                  Автоматически проверять
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Проверять наличие обновлений при запуске
                </Text>
              </VStack>
              <Switch.Root
                checked={preferences.autoCheck}
                onCheckedChange={(e) => updatePreferences({ autoCheck: e.checked })}
                colorPalette="purple"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium">
                  Автоматически скачивать
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Скачивать обновления в фоне
                </Text>
              </VStack>
              <Switch.Root
                checked={preferences.autoDownload}
                onCheckedChange={(e) => updatePreferences({ autoDownload: e.checked })}
                colorPalette="purple"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>

            <HStack justify="space-between">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium">
                  Показывать уведомления
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Toast-уведомления о доступных обновлениях
                </Text>
              </VStack>
              <Switch.Root
                checked={preferences.showNotifications}
                onCheckedChange={(e) => updatePreferences({ showNotifications: e.checked })}
                colorPalette="purple"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>
          </Stack>

          {/* Пропущенные версии */}
          {skippedVersions.length > 0 && (
            <>
              <Separator />
              <Stack gap={2}>
                <Heading size="sm">Пропущенные версии</Heading>
                {skippedVersions.map((version) => (
                  <HStack key={version} justify="space-between" p={2} bg="bg.muted" borderRadius="md">
                    <Text fontSize="sm">v{version}</Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        unskipVersion(version)}
                    >
                      <LuX />
                      Отменить пропуск
                    </Button>
                  </HStack>
                ))}
              </Stack>
            </>
          )}

          {/* История обновлений */}
          {updateHistory.length > 0 && (
            <>
              <Separator />
              <Stack gap={2}>
                <Heading size="sm">История обновлений</Heading>
                {updateHistory.map((item, index) => (
                  <HStack key={index} justify="space-between" p={2} bg="bg.muted" borderRadius="md">
                    <HStack gap={2}>
                      <Icon fontSize="sm" color="purple.fg" asChild>
                        <LuCalendar />
                      </Icon>
                      <Text fontSize="sm" fontWeight="medium">
                        v{item.version}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {new Date(item.installedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            </>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
