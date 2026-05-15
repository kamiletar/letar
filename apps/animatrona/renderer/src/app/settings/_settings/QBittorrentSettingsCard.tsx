'use client'

/**
 * Карточка настроек подключения к qBittorrent
 *
 * qBittorrent — единственный торрент-бэкенд в Animatrona. Пользователь
 * устанавливает его локально и включает Web UI, а здесь настраивает
 * URL/логин/пароль для подключения.
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Field,
  Heading,
  HStack,
  Icon,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCheck, LuExternalLink, LuGauge, LuInfo, LuX } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import { useFindUniqueSettings, useUpsertSettings } from '@/lib/hooks'

/** Дефолтный URL Web UI qBittorrent */
const DEFAULT_QB_URL = 'http://localhost:8080'
/** Дефолтный логин qBittorrent */
const DEFAULT_QB_USERNAME = 'admin'

/** Результат проверки подключения */
interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error'
  version?: string
  error?: string
}

/**
 * Карточка настроек подключения к qBittorrent
 */
export function QBittorrentSettingsCard() {
  const { data: settings } = useFindUniqueSettings({ where: { id: 'default' } })
  const { mutate: upsertSettings } = useUpsertSettings()

  // Локальное состояние формы
  const [url, setUrl] = useState(DEFAULT_QB_URL)
  const [username, setUsername] = useState(DEFAULT_QB_USERNAME)
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' })
  const [showInstructions, setShowInstructions] = useState(false)

  // Загружаем значения из БД
  useEffect(() => {
    if (!settings) {
      return
    }
    const s = settings as unknown as {
      qbittorrentUrl?: string | null
      qbittorrentUsername?: string | null
      qbittorrentPassword?: string | null
    }
    setUrl(s.qbittorrentUrl ?? DEFAULT_QB_URL)
    setUsername(s.qbittorrentUsername ?? DEFAULT_QB_USERNAME)
    setPassword(s.qbittorrentPassword ?? '')
  }, [settings])

  // Сохранить настройки в БД
  const handleSave = useCallback(() => {
    upsertSettings(
      {
        where: { id: 'default' },
        create: {
          id: 'default',
          qbittorrentUrl: url,
          qbittorrentUsername: username,
          qbittorrentPassword: password,
        },
        update: {
          qbittorrentUrl: url,
          qbittorrentUsername: username,
          qbittorrentPassword: password,
        },
      } as never,
      {
        onSuccess: () => {
          toaster.success({ title: 'Настройки qBittorrent сохранены' })
        },
        onError: (error: unknown) => {
          toaster.error({
            title: 'Не удалось сохранить',
            description: error instanceof Error ? error.message : String(error),
          })
        },
      },
    )
  }, [url, username, password, upsertSettings])

  // Проверить подключение к qBittorrent
  const handleTest = useCallback(async () => {
    setTestResult({ status: 'testing' })
    try {
      // torrent API не типизирован в electron.d.ts — используем cast
      const torrentApi = (
        window.electronAPI as unknown as {
          torrent?: {
            testQBittorrentConnection?: (cfg: {
              url: string
              username: string
              password: string
            }) => Promise<{
              success: boolean
              data?: { success: boolean; version?: string; error?: string }
              error?: string
            }>
          }
        }
      ).torrent

      const response = await torrentApi?.testQBittorrentConnection?.({ url, username, password })

      if (!response) {
        setTestResult({ status: 'error', error: 'Метод недоступен (перезапустите приложение)' })
        return
      }

      if (response.success && response.data?.success) {
        setTestResult({ status: 'success', version: response.data.version })
      } else {
        setTestResult({
          status: 'error',
          error: response.data?.error ?? response.error ?? 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [url, username, password])

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">
          <HStack>
            <Icon>
              <LuGauge />
            </Icon>
            <Text>Подключение к qBittorrent</Text>
          </HStack>
        </Heading>
      </Card.Header>
      <Card.Body>
        <VStack gap={5} align="stretch">
          <Text fontSize="sm" color="fg.muted">
            Animatrona использует qBittorrent как торрент-бэкенд — он качает файлы на диск отдельным процессом и не
            расходует память основного приложения. Установите qBittorrent, включите Web UI и укажите параметры
            подключения ниже.
          </Text>

          <Field.Root>
            <Field.Label>URL Web UI</Field.Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              placeholder={DEFAULT_QB_URL}
            />
            <Field.HelperText>
              Адрес Web UI qBittorrent (Tools → Options → Web UI → IP address + Port)
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Логин</Field.Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              placeholder={DEFAULT_QB_USERNAME}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Пароль</Field.Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="(оставьте пустым для localhost с skip auth)"
            />
          </Field.Root>

          {/* Кнопки */}
          <HStack gap={3}>
            <Button
              variant="outline"
              onClick={() => void handleTest()}
              loading={testResult.status === 'testing'}
              loadingText="Проверка..."
            >
              Проверить подключение
            </Button>

            {testResult.status === 'success' && (
              <Badge colorPalette="green">
                <HStack gap={1}>
                  <Icon as={LuCheck} boxSize={3} />
                  <Text>Подключено {testResult.version && `(v${testResult.version})`}</Text>
                </HStack>
              </Badge>
            )}

            {testResult.status === 'error' && (
              <Badge colorPalette="red">
                <HStack gap={1}>
                  <Icon as={LuX} boxSize={3} />
                  <Text>Ошибка</Text>
                </HStack>
              </Badge>
            )}
          </HStack>

          {testResult.status === 'error' && testResult.error && (
            <Text fontSize="xs" color="fg.error">
              {testResult.error}
            </Text>
          )}

          {/* Инструкция */}
          <Collapsible.Root
            open={showInstructions}
            onOpenChange={(e) => setShowInstructions(e.open)}
          >
            <Collapsible.Trigger asChild>
              <Button size="sm" variant="ghost" justifyContent="flex-start">
                <Icon as={LuInfo} mr={2} />
                Как настроить qBittorrent?
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt={2} p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px">
                <VStack align="start" gap={2} fontSize="sm">
                  <HStack>
                    <Text fontWeight="semibold">1.</Text>
                    <Text>Установите qBittorrent:</Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="blue"
                      onClick={() => window.electronAPI?.app?.openExternal('https://www.qbittorrent.org/')}
                    >
                      qbittorrent.org <Icon as={LuExternalLink} ml={1} boxSize={3} />
                    </Button>
                  </HStack>
                  <Text>
                    <strong>2.</strong> Запустите qBittorrent → <strong>Tools → Options → Web UI</strong>
                  </Text>
                  <Text>
                    <strong>3.</strong> Включите «Web User Interface», задайте порт (дефолт 8080), логин и пароль
                  </Text>
                  <Text>
                    <strong>4.</strong> Скопируйте URL/логин/пароль сюда и нажмите «Проверить подключение»
                  </Text>
                  <Text color="fg.muted" fontSize="xs" pt={1}>
                    qBittorrent должен быть запущен во время скачивания. Можно настроить автозапуск при старте системы.
                  </Text>
                </VStack>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>

          {/* Кнопка сохранения */}
          <HStack justify="flex-end">
            <Button colorPalette="blue" onClick={handleSave}>
              Сохранить
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
