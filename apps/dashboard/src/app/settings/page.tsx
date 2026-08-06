'use client'

import {
  controlMonitoringAction,
  testTelegramAction,
  toggleAlertsAction,
  toggleAutoCleanupAction,
  toggleTelegramAction,
} from '@/app/_actions/settings-actions'
import { Header } from '@/app/_components/layout/Header'
import { Field } from '@/app/_components/ui/field'
import { Switch } from '@/app/_components/ui/switch'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Card, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useOptimistic, useState, useTransition } from 'react'

interface AlertSettings {
  enabled: boolean
  cpuThreshold: number
  memoryThreshold: number
  diskThreshold: number
  checkInterval: number
  telegramEnabled: boolean
  telegramBotToken: string
  telegramChatId: string
}

interface MonitoringStatus {
  isRunning: boolean
  lastCheck: string | null
  checksCount: number
  alertsSent: number
  activeAlertsCount: number
}

interface BackupSettings {
  autoCleanupEnabled: boolean
  retentionDays: number
  keepMinimum: number
}

// Тип для оптимистичного состояния
interface OptimisticState {
  alertsEnabled: boolean
  telegramEnabled: boolean
  autoCleanupEnabled: boolean
}

const defaultBackupSettings: BackupSettings = {
  autoCleanupEnabled: false,
  retentionDays: 30,
  keepMinimum: 3,
}

async function fetchSettings(): Promise<AlertSettings> {
  const res = await fetch('/api/alerts/settings')
  if (!res.ok) {
    throw new Error('Failed to fetch settings')
  }
  return res.json()
}

async function fetchMonitoringStatus(): Promise<MonitoringStatus> {
  const res = await fetch('/api/monitoring/auto-start')
  if (!res.ok) {
    throw new Error('Failed to fetch monitoring status')
  }
  const data = await res.json()
  return data
}

async function fetchBackupSettings(): Promise<BackupSettings> {
  const res = await fetch('/api/database/backup-settings')
  if (!res.ok) {
    throw new Error('Failed to fetch backup settings')
  }
  return res.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    cpuThreshold: 80,
    memoryThreshold: 90,
    diskThreshold: 85,
    checkInterval: 30,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
  })

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(defaultBackupSettings)

  // Fetch settings
  const { data: savedSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: fetchSettings,
  })

  // Fetch monitoring status
  const { data: monitoringStatus, isLoading: monitoringLoading } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: fetchMonitoringStatus,
    refetchInterval: 5000,
  })

  // Fetch backup settings
  const { data: savedBackupSettings, isLoading: backupSettingsLoading } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: fetchBackupSettings,
  })

  // Оптимистичное состояние для toggle'ов
  const initialOptimisticState: OptimisticState = {
    alertsEnabled: savedSettings?.enabled ?? true,
    telegramEnabled: savedSettings?.telegramEnabled ?? false,
    autoCleanupEnabled: savedBackupSettings?.autoCleanupEnabled ?? false,
  }

  const [optimisticState, setOptimisticState] = useOptimistic(
    initialOptimisticState,
    (state: OptimisticState, update: Partial<OptimisticState>) => ({
      ...state,
      ...update,
    }),
  )

  // Update local state when settings are fetched
  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings)
    }
  }, [savedSettings])

  // Update local state when backup settings are fetched
  useEffect(() => {
    if (savedBackupSettings) {
      setBackupSettings(savedBackupSettings)
    }
  }, [savedBackupSettings])

  // Обработчик toggle Alerts с useOptimistic
  const handleToggleAlerts = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticState({ alertsEnabled: checked })
      setSettings((prev) => ({ ...prev, enabled: checked }))

      const result = await toggleAlertsAction(checked)

      if (!result.success) {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
        // Откат
        setSettings((prev) => ({ ...prev, enabled: !checked }))
      }
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
    })
  }

  // Обработчик toggle Telegram с useOptimistic
  const handleToggleTelegram = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticState({ telegramEnabled: checked })
      setSettings((prev) => ({ ...prev, telegramEnabled: checked }))

      const result = await toggleTelegramAction(checked)

      if (!result.success) {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
        setSettings((prev) => ({ ...prev, telegramEnabled: !checked }))
      }
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
    })
  }

  // Обработчик toggle Auto-Cleanup с useOptimistic
  const handleToggleAutoCleanup = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticState({ autoCleanupEnabled: checked })
      setBackupSettings((prev) => ({ ...prev, autoCleanupEnabled: checked }))

      const result = await toggleAutoCleanupAction(checked)

      if (!result.success) {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
        setBackupSettings((prev) => ({ ...prev, autoCleanupEnabled: !checked }))
      }
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
    })
  }

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: AlertSettings) => {
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) {
        throw new Error('Failed to save settings')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
      toaster.create({
        title: 'Настройки сохранены',
        description: 'Настройки алертов обновлены',
        type: 'success',
      })
    },
    onError: (error) => {
      toaster.create({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      })
    },
  })

  // Monitoring control с Server Action
  const handleMonitoringControl = (action: 'start' | 'stop' | 'restart') => {
    startTransition(async () => {
      const result = await controlMonitoringAction(action)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['monitoring-status'] })
        toaster.create({
          title: 'message' in result ? (result as { message: string }).message : 'OK',
          type: 'success',
        })
      } else {
        toaster.create({
          title: 'Ошибка',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Save backup settings mutation
  const saveBackupMutation = useMutation({
    mutationFn: async (newSettings: BackupSettings) => {
      const res = await fetch('/api/database/backup-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) {
        throw new Error('Failed to save backup settings')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
      toaster.create({
        title: 'Настройки сохранены',
        description: 'Настройки бэкапов обновлены',
        type: 'success',
      })
    },
    onError: (error) => {
      toaster.create({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      })
    },
  })

  // Test Telegram с Server Action
  const handleTestTelegram = () => {
    startTransition(async () => {
      const result = await testTelegramAction()

      if (result.success) {
        toaster.create({
          title: 'Тест успешен',
          description: 'Проверьте Telegram для получения тестового сообщения',
          type: 'success',
        })
      } else {
        toaster.create({
          title: 'Ошибка теста',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const handleSaveBackupSettings = () => {
    saveBackupMutation.mutate(backupSettings)
  }

  const formatLastCheck = (lastCheck: string | null) => {
    if (!lastCheck) {
      return 'Never'
    }
    return new Date(lastCheck).toLocaleString('ru-RU')
  }

  // Используем оптимистичные значения для отображения
  const displayAlertsEnabled = isPending ? optimisticState.alertsEnabled : settings.enabled
  const displayTelegramEnabled = isPending ? optimisticState.telegramEnabled : settings.telegramEnabled
  const displayAutoCleanupEnabled = isPending ? optimisticState.autoCleanupEnabled : backupSettings.autoCleanupEnabled

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <Heading mb="6">Настройки</Heading>

        <VStack gap="6" align="stretch" maxW="2xl">
          {/* Monitoring Status */}
          <Card.Root>
            <Card.Header>
              <HStack justify="space-between">
                <Heading size="md">Сервис мониторинга</Heading>
                <Badge colorPalette={monitoringStatus?.isRunning ? 'green' : 'red'} size="lg">
                  {monitoringStatus?.isRunning ? 'Запущен' : 'Остановлен'}
                </Badge>
              </HStack>
            </Card.Header>
            <Card.Body>
              <VStack gap="4" align="stretch">
                {!monitoringLoading && monitoringStatus && (
                  <HStack gap="6" flexWrap="wrap">
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Последняя проверка
                      </Text>
                      <Text fontWeight="medium">{formatLastCheck(monitoringStatus.lastCheck)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Всего проверок
                      </Text>
                      <Text fontWeight="medium">{monitoringStatus.checksCount}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Отправлено алертов
                      </Text>
                      <Text fontWeight="medium">{monitoringStatus.alertsSent}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Активных алертов
                      </Text>
                      <Text fontWeight="medium" color={monitoringStatus.activeAlertsCount > 0 ? 'red.500' : undefined}>
                        {monitoringStatus.activeAlertsCount}
                      </Text>
                    </Box>
                  </HStack>
                )}

                <HStack gap="2" pt="2">
                  {monitoringStatus?.isRunning
                    ? (
                      <>
                        <Button
                          size="sm"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => handleMonitoringControl('stop')}
                          loading={isPending}
                        >
                          Остановить
                        </Button>
                        <Button
                          size="sm"
                          colorPalette="blue"
                          variant="outline"
                          onClick={() => handleMonitoringControl('restart')}
                          loading={isPending}
                        >
                          Перезапустить
                        </Button>
                      </>
                    )
                    : (
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() => handleMonitoringControl('start')}
                        loading={isPending}
                      >
                        Запустить мониторинг
                      </Button>
                    )}
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Alert System */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Система алертов</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap="4" align="stretch">
                <Field label="Включить алерты">
                  <Switch
                    checked={displayAlertsEnabled}
                    onCheckedChange={(e) => handleToggleAlerts(e.checked as boolean)}
                    disabled={isPending}
                  />
                </Field>

                <Field label="Интервал проверки (секунды)">
                  <Input
                    type="number"
                    value={settings.checkInterval}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        checkInterval: parseInt(e.target.value, 10) || 30,
                      })}
                  />
                </Field>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Thresholds */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Пороговые значения</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap="4" align="stretch">
                <Field label="Порог CPU (%)">
                  <Input
                    type="number"
                    value={settings.cpuThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cpuThreshold: parseInt(e.target.value, 10) || 80,
                      })}
                  />
                </Field>

                <Field label="Порог памяти (%)">
                  <Input
                    type="number"
                    value={settings.memoryThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        memoryThreshold: parseInt(e.target.value, 10) || 90,
                      })}
                  />
                </Field>

                <Field label="Порог диска (%)">
                  <Input
                    type="number"
                    value={settings.diskThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        diskThreshold: parseInt(e.target.value, 10) || 85,
                      })}
                  />
                </Field>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Telegram Notifications */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Telegram уведомления</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap="4" align="stretch">
                <Field label="Включить Telegram">
                  <Switch
                    checked={displayTelegramEnabled}
                    onCheckedChange={(e) => handleToggleTelegram(e.checked as boolean)}
                    disabled={isPending}
                  />
                </Field>

                <Field label="Токен бота" helperText="Токен Telegram Bot API от @BotFather">
                  <Input
                    type="password"
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                    disabled={!displayTelegramEnabled}
                  />
                </Field>

                <Field label="Chat ID" helperText="Ваш Telegram Chat ID от @userinfobot">
                  <Input
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                    disabled={!displayTelegramEnabled}
                  />
                </Field>

                <Text fontSize="xs" color="fg.muted">
                  Чтобы получить Chat ID, отправьте сообщение @userinfobot в Telegram
                </Text>

                {displayTelegramEnabled && settings.telegramBotToken && settings.telegramChatId && (
                  <Button size="sm" variant="outline" onClick={handleTestTelegram} loading={isPending}>
                    Тест Telegram
                  </Button>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Backup Auto-Cleanup */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Автоочистка бэкапов</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap="4" align="stretch">
                <Field label="Включить автоочистку">
                  <Switch
                    checked={displayAutoCleanupEnabled}
                    onCheckedChange={(e) => handleToggleAutoCleanup(e.checked as boolean)}
                    disabled={isPending}
                  />
                </Field>

                <Field label="Дней хранения" helperText="Удалять бэкапы старше указанного количества дней">
                  <Input
                    type="number"
                    value={backupSettings.retentionDays}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        retentionDays: parseInt(e.target.value, 10) || 30,
                      })}
                    disabled={!displayAutoCleanupEnabled}
                  />
                </Field>

                <Field label="Минимум хранить" helperText="Всегда хранить минимум указанное количество бэкапов на базу">
                  <Input
                    type="number"
                    value={backupSettings.keepMinimum}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        keepMinimum: parseInt(e.target.value, 10) || 3,
                      })}
                    disabled={!displayAutoCleanupEnabled}
                  />
                </Field>

                <Button
                  size="sm"
                  colorPalette="fg"
                  onClick={handleSaveBackupSettings}
                  loading={saveBackupMutation.isPending || backupSettingsLoading}
                >
                  Сохранить настройки бэкапов
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Save Alert Settings Button */}
          <HStack>
            <Button colorPalette="fg" onClick={handleSave} loading={saveMutation.isPending || settingsLoading}>
              Сохранить настройки алертов
            </Button>
          </HStack>
        </VStack>
      </Box>
    </>
  )
}
