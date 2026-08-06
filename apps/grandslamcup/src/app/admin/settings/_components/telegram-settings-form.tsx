'use client'

/**
 * Форма настроек Telegram-бота.
 * Токен бота (глобальный), вкл/выкл, тест-отправка.
 */

import {
  deleteTelegramWebhookAction,
  getCitiesWithChatIdAction,
  getWebhookInfoAction,
  saveTelegramConfigAction,
  setupTelegramWebhookAction,
  testTelegramAction,
} from '@/app/admin/settings/_actions/settings.action'
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Heading,
  HStack,
  Input,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { LuCheck, LuLink, LuRefreshCw, LuSend, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

interface TelegramSettingsFormProps {
  initialConfig: {
    botToken: string
    botTokenSet: boolean
    enabled: boolean
    autoAnnouncement: boolean
    autoHalfTime: boolean
    autoResult: boolean
  }
}

export function TelegramSettingsForm({ initialConfig }: TelegramSettingsFormProps) {
  const [botToken, setBotToken] = useState(initialConfig.botToken)
  const [enabled, setEnabled] = useState(initialConfig.enabled)
  const [autoAnnouncement, setAutoAnnouncement] = useState(initialConfig.autoAnnouncement)
  const [autoHalfTime, setAutoHalfTime] = useState(initialConfig.autoHalfTime)
  const [autoResult, setAutoResult] = useState(initialConfig.autoResult)
  const [saving, startSaving] = useTransition()
  const [testing, startTesting] = useTransition()
  const [webhookBusy, startWebhook] = useTransition()
  const [testChatId, setTestChatId] = useState('')
  const [cities, setCities] = useState<Array<{ id: string; name: string; telegramChatId: string | null }>>([])
  const [webhookInfo, setWebhookInfo] = useState<
    {
      url: string
      pendingUpdates: number
      lastError: string | null
      lastErrorDate: string | null
      allowedUpdates: string[]
    } | null
  >(null)

  useEffect(() => {
    getCitiesWithChatIdAction().then((result) => {
      if ('data' in result && result.data) {
        setCities(result.data)
      }
    })
  }, [])

  const handleSave = () => {
    startSaving(async () => {
      const result = await saveTelegramConfigAction({ botToken, enabled, autoAnnouncement, autoHalfTime, autoResult })
      if (result.success) {
        toaster.success({ title: 'Настройки сохранены' })
      } else {
        toaster.error({ title: result.error ?? 'Ошибка сохранения' })
      }
    })
  }

  const handleTest = (chatId: string) => {
    startTesting(async () => {
      const result = await testTelegramAction(chatId)
      if (result.success) {
        toaster.success({ title: 'Тестовое сообщение отправлено' })
      } else {
        toaster.error({ title: result.error ?? 'Ошибка отправки' })
      }
    })
  }

  const handleWebhookSetup = () => {
    startWebhook(async () => {
      const result = await setupTelegramWebhookAction()
      if (result.success) {
        toaster.success({ title: 'Webhook установлен', description: result.url })
        // Обновляем информацию
        const info = await getWebhookInfoAction()
        if (info.success) setWebhookInfo(info.info)
      } else {
        toaster.error({ title: result.error ?? 'Ошибка установки webhook' })
      }
    })
  }

  const handleWebhookInfo = () => {
    startWebhook(async () => {
      const result = await getWebhookInfoAction()
      if (result.success) {
        setWebhookInfo(result.info)
        toaster.success({ title: 'Информация обновлена' })
      } else {
        toaster.error({ title: result.error ?? 'Ошибка получения информации' })
      }
    })
  }

  const handleWebhookDelete = () => {
    startWebhook(async () => {
      const result = await deleteTelegramWebhookAction()
      if (result.success) {
        setWebhookInfo(null)
        toaster.success({ title: 'Webhook удалён' })
      } else {
        toaster.error({ title: result.error ?? 'Ошибка удаления' })
      }
    })
  }

  const citiesWithChat = cities.filter((c) => c.telegramChatId)

  return (
    <VStack gap={6} align="stretch">
      {/* Настройки бота */}
      <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={5}>
        <Heading size="md" mb={4}>
          Telegram-бот
        </Heading>

        <VStack gap={4} align="stretch">
          {/* Токен */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Токен бота
            </Text>
            <Input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              maxW="500px"
            />
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Получить у @BotFather в Telegram
            </Text>
          </Box>

          {/* Вкл/выкл */}
          <HStack gap={3}>
            <Switch.Root checked={enabled} onCheckedChange={(e) => setEnabled(e.checked)}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
            <Text fontSize="sm">Бот {enabled ? 'включён' : 'выключен'}</Text>
            <Badge colorPalette={enabled ? 'green' : 'gray'} size="sm">
              {enabled ? 'ON' : 'OFF'}
            </Badge>
          </HStack>

          <Button onClick={handleSave} loading={saving} colorPalette="brand" maxW="200px">
            <LuCheck />
            Сохранить
          </Button>
        </VStack>
      </Box>

      {/* Автопубликация */}
      <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={5}>
        <Heading size="md" mb={4}>
          Автопубликация
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Автоматическая отправка в Telegram без нажатия кнопок в админке.
        </Text>

        <VStack gap={3} align="stretch">
          <HStack gap={3}>
            <Switch.Root checked={autoAnnouncement} onCheckedChange={(e) => setAutoAnnouncement(e.checked)}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Автоанонс
              </Text>
              <Text fontSize="xs" color="fg.muted">
                При заполнении составов обеих команд
              </Text>
            </Box>
          </HStack>

          <HStack gap={3}>
            <Switch.Root checked={autoHalfTime} onCheckedChange={(e) => setAutoHalfTime(e.checked)}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Автоитог тайма
              </Text>
              <Text fontSize="xs" color="fg.muted">
                При завершении каждого тайма
              </Text>
            </Box>
          </HStack>

          <HStack gap={3}>
            <Switch.Root checked={autoResult} onCheckedChange={(e) => setAutoResult(e.checked)}>
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Авторезультат
              </Text>
              <Text fontSize="xs" color="fg.muted">
                При завершении матча
              </Text>
            </Box>
          </HStack>
        </VStack>

        <Button onClick={handleSave} loading={saving} colorPalette="brand" maxW="200px" mt={4}>
          <LuCheck />
          Сохранить
        </Button>
      </Box>

      {/* Webhook */}
      <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={5}>
        <Heading size="md" mb={2}>
          Webhook
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Webhook нужен для личных сообщений тренерам (привязка через /start) и аналитики реакций.
        </Text>

        <HStack gap={2} mb={4} wrap="wrap">
          <Button onClick={handleWebhookSetup} loading={webhookBusy} colorPalette="green">
            <LuLink />
            Установить webhook
          </Button>
          <Button onClick={handleWebhookInfo} loading={webhookBusy} variant="outline">
            <LuRefreshCw />
            Проверить
          </Button>
          <Button onClick={handleWebhookDelete} loading={webhookBusy} variant="outline" colorPalette="red">
            <LuTrash2 />
            Удалить
          </Button>
        </HStack>

        {webhookInfo && (
          <VStack gap={2} align="stretch" p={3} bg="bg.subtle" borderRadius="md">
            <HStack gap={2}>
              <Text fontSize="xs" fontWeight="medium" color="fg.muted">
                URL:
              </Text>
              <Code fontSize="xs">{webhookInfo.url || '(не установлен)'}</Code>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" fontWeight="medium" color="fg.muted">
                Ожидает обновлений:
              </Text>
              <Badge colorPalette={webhookInfo.pendingUpdates > 0 ? 'yellow' : 'gray'} size="sm">
                {webhookInfo.pendingUpdates}
              </Badge>
            </HStack>
            {webhookInfo.allowedUpdates.length > 0 && (
              <HStack gap={2} wrap="wrap">
                <Text fontSize="xs" fontWeight="medium" color="fg.muted">
                  Типы updates:
                </Text>
                {webhookInfo.allowedUpdates.map((u) => (
                  <Badge key={u} size="sm" colorPalette="blue">
                    {u}
                  </Badge>
                ))}
              </HStack>
            )}
            {webhookInfo.lastError && (
              <Box p={2} bg="red.subtle" borderRadius="sm">
                <Text fontSize="xs" color="red.fg">
                  <b>Последняя ошибка:</b> {webhookInfo.lastError}
                </Text>
                {webhookInfo.lastErrorDate && (
                  <Text fontSize="xs" color="red.fg">
                    {new Date(webhookInfo.lastErrorDate).toLocaleString('ru-RU')}
                  </Text>
                )}
              </Box>
            )}
          </VStack>
        )}
      </Box>

      <Separator />

      {/* Тестирование */}
      <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={5}>
        <Heading size="md" mb={4}>
          Тестирование
        </Heading>

        {/* Города с настроенным chatId */}
        {citiesWithChat.length > 0 && (
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Города с Telegram-каналом:
            </Text>
            <Flex gap={2} wrap="wrap">
              {citiesWithChat.map((city) => (
                <Button
                  key={city.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleTest(city.telegramChatId!)}
                  loading={testing}
                >
                  <LuSend />
                  Тест: {city.name}
                </Button>
              ))}
            </Flex>
          </Box>
        )}

        {citiesWithChat.length === 0 && (
          <Box mb={4} p={3} bg="bg.warning" borderRadius="md">
            <Text fontSize="sm" color="fg.muted">
              Ни у одного города не настроен Telegram Chat ID. Настройте его в разделе «Города».
            </Text>
          </Box>
        )}

        {/* Ручной тест */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Или введите Chat ID вручную:
          </Text>
          <HStack maxW="400px">
            <Input
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              placeholder="@channel или -100..."
              size="sm"
            />
            <Button size="sm" onClick={() => handleTest(testChatId)} loading={testing} disabled={!testChatId.trim()}>
              <LuSend />
              Тест
            </Button>
          </HStack>
        </Box>
      </Box>

      {/* Подсказка */}
      <Box p={4} bg="bg.subtle" borderRadius="md">
        <Text fontSize="sm" color="fg.muted">
          <b>Chat ID каналов</b>{' '}
          настраивается в разделе «Города» — у каждого города свой канал. Бот должен быть добавлен администратором
          канала.
        </Text>
      </Box>
    </VStack>
  )
}
