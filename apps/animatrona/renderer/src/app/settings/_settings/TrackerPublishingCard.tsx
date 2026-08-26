'use client'

/**
 * Карточка настроек публикации на Animatrona Tracker
 *
 * Позволяет:
 * - Настроить URL трекера и API ключ
 * - Проверить подключение
 * - Включить/выключить публикацию
 */

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Input,
  Switch as ChakraSwitch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  LuCheck,
  LuCloud,
  LuDownload,
  LuExternalLink,
  LuGlobe,
  LuKey,
  LuRefreshCw,
  LuUpload,
  LuX,
} from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

interface TrackerConfig {
  baseUrl: string
  apiKey: string
  enabled: boolean
}

interface ConnectionStatus {
  checked: boolean
  success: boolean
  message: string
  trackerName?: string
}

/**
 * Карточка настроек Tracker Publishing
 */
export function TrackerPublishingCard() {
  const [config, setConfig] = useState<TrackerConfig>({
    baseUrl: 'https://animatrona-tracker.letar.best',
    apiKey: '',
    enabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    checked: false,
    success: false,
    message: '',
  })

  // Локальные состояния для редактирования
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  // Загрузка конфигурации
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await window.electronAPI?.ipfs.trackerGetConfig()
        if (result?.success && result.data) {
          setConfig(result.data)
          setBaseUrl(result.data.baseUrl)
          setApiKey(result.data.apiKey)
        }
      } catch (error) {
        console.error('Ошибка загрузки конфигурации tracker:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void loadConfig()
  }, [])

  // Сохранение конфигурации
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const result = await window.electronAPI?.ipfs.trackerUpdateConfig({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      })
      if (result?.success && result.data) {
        setConfig(result.data)
        toaster.success({ title: 'Настройки сохранены' })
        // Сброс статуса проверки при изменении настроек
        setConnectionStatus({ checked: false, success: false, message: '' })
      } else {
        toaster.error({ title: result?.error || 'Ошибка сохранения' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сохранения настроек' })
    } finally {
      setIsSaving(false)
    }
  }, [baseUrl, apiKey])

  // Переключение enabled
  const handleToggleEnabled = useCallback(async (enabled: boolean) => {
    try {
      const result = await window.electronAPI?.ipfs.trackerUpdateConfig({ enabled })
      if (result?.success && result.data) {
        setConfig(result.data)
        toaster.success({ title: enabled ? 'Публикация включена' : 'Публикация отключена' })
      }
    } catch {
      toaster.error({ title: 'Ошибка изменения настроек' })
    }
  }, [])

  // Проверка подключения
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true)
    try {
      const result = await window.electronAPI?.ipfs.trackerTestConnection()
      if (result?.success && result.data) {
        setConnectionStatus({
          checked: true,
          success: result.data.success,
          message: result.data.message,
          trackerName: result.data.trackerName,
        })
        if (result.data.success) {
          toaster.success({ title: 'Подключение успешно' })
        } else {
          toaster.error({ title: result.data.message })
        }
      } else {
        setConnectionStatus({
          checked: true,
          success: false,
          message: result?.error || 'Ошибка проверки',
        })
        toaster.error({ title: result?.error || 'Ошибка проверки подключения' })
      }
    } catch {
      setConnectionStatus({
        checked: true,
        success: false,
        message: 'Ошибка сети',
      })
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setIsTesting(false)
    }
  }, [])

  const hasChanges = baseUrl !== config.baseUrl || apiKey !== config.apiKey
  const canTest = config.apiKey.length > 0

  if (isLoading) {
    return (
      <Card.Root>
        <Card.Body>
          <Text color="fg.muted">Загрузка...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={3}>
          <LuGlobe size={20} color="var(--chakra-colors-brand-500)" />
          <Heading size="md">Публикация на Tracker</Heading>
          {config.enabled && (
            <Badge colorPalette="green" size="sm">
              Включено
            </Badge>
          )}
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={5}>
          {/* Описание */}
          <Text color="fg.muted" fontSize="sm">
            Публикуйте аниме на animatrona-tracker для обмена с другими пользователями. Получите API ключ на{' '}
            <Button asChild variant="plain" colorPalette="brand" size="sm" p={0} h="auto" fontWeight="normal">
              <a
                href="https://animatrona-tracker.letar.best/profile/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                странице профиля
                <LuExternalLink size={12} style={{ marginLeft: 4 }} />
              </a>
            </Button>
          </Text>

          {/* URL трекера */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              URL трекера
            </Text>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://animatrona-tracker.letar.best"
              size="sm"
            />
          </Box>

          {/* API ключ */}
          <Box>
            <HStack mb={2}>
              <LuKey size={16} color="var(--chakra-colors-fg-muted)" />
              <Text fontSize="sm" fontWeight="medium">
                API ключ
              </Text>
            </HStack>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="at_..."
              size="sm"
            />
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Ключ начинается с "at_". Получите его в профиле трекера.
            </Text>
          </Box>

          {/* Кнопки сохранения и проверки */}
          <HStack gap={2}>
            <Button size="sm" colorPalette="brand" onClick={handleSave} loading={isSaving} disabled={!hasChanges}>
              Сохранить
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestConnection} loading={isTesting} disabled={!canTest}>
              <LuRefreshCw size={20} style={{ marginRight: 8 }} />
              Проверить подключение
            </Button>
          </HStack>

          {/* Статус подключения */}
          {connectionStatus.checked && (
            <Alert.Root status={connectionStatus.success ? 'success' : 'error'} size="sm">
              <Alert.Indicator />
              <Alert.Content>
                <HStack>
                  {connectionStatus.success ? <LuCheck size={16} /> : <LuX size={16} />}
                  <Text fontSize="sm">
                    {connectionStatus.message}
                    {connectionStatus.trackerName && ` (${connectionStatus.trackerName})`}
                  </Text>
                </HStack>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Переключатель включения */}
          <Flex justify="space-between" align="center" pt={2} borderTopWidth="1px">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" fontWeight="medium">
                Включить публикацию
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Позволяет публиковать аниме на трекер через меню "Действия"
              </Text>
            </VStack>
            <ChakraSwitch.Root
              checked={config.enabled}
              onCheckedChange={(e) => void handleToggleEnabled(e.checked)}
              disabled={!config.apiKey}
            >
              <ChakraSwitch.HiddenInput />
              <ChakraSwitch.Control />
            </ChakraSwitch.Root>
          </Flex>

          {!config.apiKey && (
            <Text fontSize="xs" color="orange.500">
              Сначала добавьте API ключ для включения публикации
            </Text>
          )}

          {/* Cloud Library — синхронизация и восстановление */}
          {config.apiKey && (
            <Box pt={4} borderTopWidth="1px">
              <HStack gap={2} mb={3}>
                <LuCloud size={16} color="var(--chakra-colors-blue-500)" />
                <Text fontSize="sm" fontWeight="medium">
                  Облачная библиотека
                </Text>
              </HStack>
              <Text fontSize="xs" color="fg.muted" mb={3}>
                Синхронизируйте статусы просмотра и оценки с трекером. Восстановите библиотеку на другом устройстве.
              </Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI?.tracker.syncLibrary()
                      if (result?.success) {
                        toaster.success({ title: `Синхронизировано: ${result.synced ?? 0} аниме` })
                      } else {
                        toaster.error({ title: result?.error || 'Ошибка синхронизации' })
                      }
                    } catch {
                      toaster.error({ title: 'Ошибка синхронизации' })
                    }
                  }}
                >
                  <LuUpload size={20} style={{ marginRight: 4 }} />
                  Синхронизировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="green"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI?.tracker.getLibrary()
                      if (result?.success && result.data) {
                        let imported = 0
                        for (const item of result.data) {
                          if (item.anime.directoryCid) {
                            try {
                              await window.electronAPI?.animeManifest.import(item.anime.directoryCid)
                              imported++
                            } catch {
                              // Пропускаем ошибки отдельных аниме
                            }
                          }
                        }
                        toaster.success({ title: `Восстановлено: ${imported} из ${result.data.length} аниме` })
                      } else {
                        toaster.error({ title: result?.error || 'Ошибка восстановления' })
                      }
                    } catch {
                      toaster.error({ title: 'Ошибка восстановления' })
                    }
                  }}
                >
                  <LuDownload size={16} style={{ marginRight: 4 }} />
                  Восстановить библиотеку
                </Button>
              </HStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
