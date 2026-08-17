'use client'

import {
  Box,
  Button,
  Card,
  Container,
  Field,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Skeleton,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useEffect, useState } from 'react'
import {
  LuCheck,
  LuCircleHelp,
  LuDownload,
  LuInfo,
  LuPlus,
  LuPrinter,
  LuRefreshCw,
  LuRotateCcw,
  LuSave,
  LuSettings,
  LuTrash2,
  LuUser,
} from 'react-icons/lu'
import { SettingsCreateFormSchema } from '../../../src/generated/form-schemas'
import type { AppSettings, PrinterInfo, PrinterProfile, UpdateStatus } from '../../types/electron'
import { toaster } from '../_components/ui/toaster'
import { Tooltip } from '../_components/ui/tooltip'

/**
 * Заголовок секции настроек с подсказкой
 */
function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <HStack gap={2}>
      <Heading size="md">{title}</Heading>
      <Tooltip content={tooltip} showArrow>
        <Box color="fg.muted" cursor="help">
          <LuCircleHelp size={16} />
        </Box>
      </Tooltip>
    </HStack>
  )
}

// Версия приложения
const APP_VERSION = '0.5.0'

// Дефолтные настройки (соответствуют @default в schema.zmodel)
const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'updatedAt'> = {
  printerName: 'TSC_TE300',
  printerMode: 'REAL',
  labelPrintMode: 'BITMAP',
  printerSpeed: 4,
  printerDensity: 8,
  copies: 1,
  templateId: 'default',
  datamatrixX: 26,
  datamatrixY: 160,
  datamatrixSize: 160,
  gtinX: 526,
  gtinY: 10,
  gtinWidth: 140,
  gtinHeight: 440,
  allowDuplicates: false,
  autoReconnect: true,
  retryAttempts: 3,
  autoUpdate: false,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState<string>('TSC_TE300')
  const [loading, setLoading] = useState(true)
  const [testPrintLoading, setTestPrintLoading] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [printersLoading, setPrintersLoading] = useState(true)

  // Профили принтеров
  const [profiles, setProfiles] = useState<PrinterProfile[]>([])
  const [newProfileName, setNewProfileName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null)

  // Загружаем настройки, темплейты и список принтеров через IPC
  useEffect(() => {
    const loadData = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          // Загружаем настройки из БД
          const settingsData = await window.electronAPI.settings.get()
          setSettings(settingsData)
          setSelectedPrinter(settingsData.printerName || 'TSC_TE300')

          // Загружаем список принтеров
          if (window.electronAPI.printer) {
            const printersList = await window.electronAPI.printer.list()
            setPrinters(printersList)
            setPrintersLoading(false)
          } else {
            setPrintersLoading(false)
          }

          // Загружаем профили
          if (window.electronAPI.profiles) {
            const profilesList = await window.electronAPI.profiles.list()
            setProfiles(profilesList)
          }
        } catch (error) {
          console.error('[Settings] Failed to load settings:', error)
          // Не устанавливаем дефолты — дожидаемся данных из БД
        }
      }
      setLoading(false)
    }

    loadData()
  }, [])

  // Сохранение настроек
  const handleSubmit = async (data: AppSettings) => {
    // Добавляем выбранный принтер
    const dataWithTemplate = { ...data, printerName: selectedPrinter }

    if (typeof window !== 'undefined' && window.electronAPI?.settings) {
      const result = await window.electronAPI.settings.save(dataWithTemplate)
      if (result.success) {
        toaster.success({ title: 'Настройки сохранены', closable: true })
      } else {
        toaster.error({ title: 'Ошибка сохранения', description: result.error, closable: true })
      }
    } else {
      toaster.success({ title: 'Настройки сохранены (dev режим)', closable: true })
    }
  }

  // Тестовая печать
  const handleTestPrint = async () => {
    setTestPrintLoading(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.printer) {
        const result = await window.electronAPI.printer.testPrint()
        if (result.success) {
          toaster.success({
            title: 'Тестовая печать',
            description: result.message || 'Этикетка успешно напечатана',
            closable: true,
          })
        } else {
          toaster.error({
            title: 'Ошибка печати',
            description: result.error || 'Не удалось напечатать тестовую этикетку',
            closable: true,
          })
        }
      } else {
        toaster.info({
          title: 'Dev режим',
          description: 'Тестовая печать недоступна без Electron',
          closable: true,
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        closable: true,
      })
    } finally {
      setTestPrintLoading(false)
    }
  }

  // Проверка обновлений
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.updater) {
        const result = await window.electronAPI.updater.check()
        if (result.updateAvailable) {
          setUpdateStatus({
            checking: false,
            available: true,
            downloaded: false,
            error: null,
            version: result.version ?? null,
            progress: null,
          })
          toaster.success({
            title: 'Доступно обновление',
            description: `Версия ${result.version} готова к загрузке`,
            closable: true,
          })
        } else {
          setUpdateStatus({
            checking: false,
            available: false,
            downloaded: false,
            error: null,
            version: null,
            progress: null,
          })
          toaster.info({
            title: 'Обновлений нет',
            description: 'У вас установлена последняя версия',
            closable: true,
          })
        }
      } else {
        toaster.info({
          title: 'Dev режим',
          description: 'Проверка обновлений недоступна без Electron',
          closable: true,
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка проверки',
        description: error instanceof Error ? error.message : 'Не удалось проверить обновления',
        closable: true,
      })
    } finally {
      setCheckingUpdate(false)
    }
  }

  // Загрузка обновления
  const handleDownloadUpdate = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.updater) {
      setUpdateStatus((prev) =>
        prev ? { ...prev, checking: false, available: true, downloaded: false, progress: 0 } : null
      )
      try {
        const result = await window.electronAPI.updater.download()
        if (result.success) {
          setUpdateStatus((prev) => (prev ? { ...prev, downloaded: true, progress: 100 } : null))
          toaster.success({
            title: 'Обновление загружено',
            description: 'Нажмите "Установить" для применения',
            closable: true,
          })
        } else {
          setUpdateStatus((prev) => (prev ? { ...prev, error: result.error ?? 'Ошибка загрузки' } : null))
          toaster.error({
            title: 'Ошибка загрузки',
            description: result.error,
            closable: true,
          })
        }
      } catch (error) {
        toaster.error({
          title: 'Ошибка загрузки',
          description: error instanceof Error ? error.message : 'Не удалось загрузить обновление',
          closable: true,
        })
      }
    }
  }

  // Установка обновления
  const handleInstallUpdate = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.updater) {
      await window.electronAPI.updater.install()
    }
  }

  // Сброс к умолчаниям
  const handleReset = async () => {
    if (!confirm('Сбросить все настройки к значениям по умолчанию?')) {
      return
    }

    setResetting(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.settings) {
        const result = await window.electronAPI.settings.save(DEFAULT_SETTINGS)
        if (result.success) {
          // Обновляем локальное состояние
          setSettings((prev: AppSettings | null) => (prev ? { ...prev, ...DEFAULT_SETTINGS } : null))
          setSelectedPrinter('TSC_TE300')
          toaster.success({ title: 'Настройки сброшены', closable: true })
        } else {
          toaster.error({
            title: 'Ошибка сброса',
            description: result.error,
            closable: true,
          })
        }
      } else {
        // Dev режим — просто обновляем состояние
        setSettings((prev: AppSettings | null) => (prev ? { ...prev, ...DEFAULT_SETTINGS } : null))
        setSelectedPrinter('TSC_TE300')
        toaster.success({ title: 'Настройки сброшены (dev режим)', closable: true })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сбросить настройки',
        closable: true,
      })
    } finally {
      setResetting(false)
    }
  }

  /**
   * Сохранить текущие настройки как профиль
   */
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) {
      toaster.error({ title: 'Введите имя профиля', closable: true })
      return
    }

    if (!settings) {
      return
    }

    setSavingProfile(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.profiles) {
        const result = await window.electronAPI.profiles.create({
          name: newProfileName.trim(),
          printerName: selectedPrinter,
          printerSpeed: settings.printerSpeed,
          printerDensity: settings.printerDensity,
          copies: settings.copies,
          // Поля ниже сохраняем со значениями по умолчанию (не используются в новом рендере)
          templateId: 'default',
          datamatrixX: 26,
          datamatrixY: 160,
          datamatrixSize: 160,
          gtinX: 526,
          gtinY: 10,
          gtinWidth: 140,
          gtinHeight: 440,
        })

        if (result.success && result.profile) {
          setProfiles((prev) => [...prev, result.profile!])
          setNewProfileName('')
          toaster.success({ title: 'Профиль сохранён', closable: true })
        } else {
          toaster.error({ title: 'Ошибка сохранения', description: result.error, closable: true })
        }
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить профиль',
        closable: true,
      })
    } finally {
      setSavingProfile(false)
    }
  }

  /**
   * Удалить профиль
   */
  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Удалить этот профиль?')) {
      return
    }

    setDeletingProfileId(id)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.profiles) {
        const result = await window.electronAPI.profiles.delete(id)
        if (result.success) {
          setProfiles((prev) => prev.filter((p) => p.id !== id))
          toaster.success({ title: 'Профиль удалён', closable: true })
        } else {
          toaster.error({ title: 'Ошибка удаления', description: result.error, closable: true })
        }
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить профиль',
        closable: true,
      })
    } finally {
      setDeletingProfileId(null)
    }
  }

  /**
   * Применить профиль к настройкам
   */
  const handleApplyProfile = async (profile: PrinterProfile) => {
    if (!settings) {
      return
    }

    // Обновляем локальное состояние (только настройки принтера)
    setSettings((prev: AppSettings | null) =>
      prev
        ? {
          ...prev,
          printerSpeed: profile.printerSpeed,
          printerDensity: profile.printerDensity,
          copies: profile.copies,
        }
        : null
    )
    setSelectedPrinter(profile.printerName)

    // Сохраняем в настройках
    if (typeof window !== 'undefined' && window.electronAPI?.settings) {
      const result = await window.electronAPI.settings.save({
        printerName: profile.printerName,
        printerSpeed: profile.printerSpeed,
        printerDensity: profile.printerDensity,
        copies: profile.copies,
      })

      if (result.success) {
        toaster.success({ title: `Профиль "${profile.name}" применён`, closable: true })
      } else {
        toaster.error({ title: 'Ошибка применения', description: result.error, closable: true })
      }
    }
  }

  if (loading || !settings) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={6} align="stretch">
          <VStack align="start" gap={1}>
            <Heading size="2xl">Настройки</Heading>
            <Text color="fg.muted">Конфигурация принтера и этикеток</Text>
          </VStack>
          {/* Skeleton loading */}
          <Card.Root>
            <Card.Header>
              <Skeleton height="24px" width="120px" />
            </Card.Header>
            <Card.Body>
              <VStack gap={4} align="stretch">
                <Skeleton height="40px" />
                <Skeleton height="40px" />
                <Skeleton height="40px" />
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <VStack align="start" gap={1}>
          <Heading size="2xl">Настройки</Heading>
          <Text color="fg.muted">Конфигурация принтера и этикеток</Text>
        </VStack>

        {/* Форма настроек с Tabs */}
        <Form schema={SettingsCreateFormSchema} initialValue={settings} onSubmit={handleSubmit}>
          <Tabs.Root defaultValue="printer" variant="enclosed">
            <Tabs.List mb={4}>
              <Tabs.Trigger value="printer">
                <LuPrinter />
                Принтер
              </Tabs.Trigger>
              <Tabs.Trigger value="behavior">
                <LuSettings />
                Поведение
              </Tabs.Trigger>
              <Tabs.Trigger value="profiles">
                <LuUser />
                Профили
              </Tabs.Trigger>
              <Tabs.Trigger value="about">
                <LuInfo />О приложении
              </Tabs.Trigger>
            </Tabs.List>

            {/* Вкладка: Принтер */}
            <Tabs.Content value="printer">
              <VStack gap={6} align="stretch">
                <Card.Root>
                  <Card.Header>
                    <SectionHeader
                      title="Параметры принтера"
                      tooltip="Настройки подключения и режима работы принтера этикеток"
                    />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      {/* Выбор принтера из списка */}
                      <Field.Root>
                        <Field.Label>Принтер</Field.Label>
                        {printersLoading ? <Skeleton height="40px" /> : printers.length > 0
                          ? (
                            <NativeSelect.Root>
                              <NativeSelect.Field
                                value={selectedPrinter}
                                onChange={(e) => setSelectedPrinter(e.currentTarget.value)}
                              >
                                {printers.map((p) => (
                                  <option key={p.name} value={p.name}>
                                    {p.displayName} {p.isDefault && '(по умолчанию)'}
                                  </option>
                                ))}
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          )
                          : (
                            <VStack align="stretch" gap={2}>
                              <Text fontSize="sm" color="fg.muted">
                                Принтеры не найдены. Введите имя вручную:
                              </Text>
                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  as="input"
                                  value={selectedPrinter}
                                  onChange={(e) => setSelectedPrinter(e.currentTarget.value)}
                                  placeholder="Имя принтера"
                                />
                              </NativeSelect.Root>
                            </VStack>
                          )}
                      </Field.Root>

                      <Form.Field.RadioCard
                        name="printerMode"
                        options={[
                          { value: 'REAL', label: 'Реальный принтер' },
                          { value: 'MOCK', label: 'Тестовый режим' },
                        ]}
                      />
                      <HStack gap={4}>
                        <Form.Field.Slider name="printerSpeed" />
                        <Form.Field.Slider name="printerDensity" />
                      </HStack>
                      <Form.Field.NumberInput name="copies" />
                    </VStack>
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <SectionHeader
                      title="Размеры элементов"
                      tooltip="Настройки размеров DataMatrix и штрихкода на этикетке"
                    />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Form.Field.NumberInput name="datamatrixSize" />
                    </VStack>
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <SectionHeader
                      title="Тестирование"
                      tooltip="Проверьте работоспособность принтера перед началом печати"
                    />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Text fontSize="sm" color="fg.muted">
                        Напечатайте тестовую этикетку для проверки настроек принтера
                      </Text>
                      <Button
                        variant="outline"
                        colorPalette="blue"
                        onClick={handleTestPrint}
                        loading={testPrintLoading}
                        loadingText="Печать..."
                        width="fit-content"
                      >
                        <LuPrinter />
                        Тестовая печать
                      </Button>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </VStack>
            </Tabs.Content>

            {/* Вкладка: Поведение */}
            <Tabs.Content value="behavior">
              <VStack gap={6} align="stretch">
                <Card.Root>
                  <Card.Header>
                    <SectionHeader title="Настройки поведения" tooltip="Параметры автоматизации и обработки ошибок" />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Form.Field.Switch name="allowDuplicates" />
                      <Form.Field.Switch name="autoReconnect" />
                      <Form.Field.Switch name="autoUpdate" />
                      <Form.Field.NumberInput name="retryAttempts" />
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {/* Сброс настроек */}
                <Card.Root>
                  <Card.Header>
                    <SectionHeader title="Сброс настроек" tooltip="Восстановление заводских настроек приложения" />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Text fontSize="sm" color="fg.muted">
                        Сбросить все настройки к значениям по умолчанию. Это действие нельзя отменить.
                      </Text>
                      <Button
                        variant="outline"
                        colorPalette="red"
                        onClick={handleReset}
                        loading={resetting}
                        loadingText="Сброс..."
                        width="fit-content"
                      >
                        <LuRotateCcw />
                        Сбросить к умолчаниям
                      </Button>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </VStack>
            </Tabs.Content>

            {/* Вкладка: Профили */}
            <Tabs.Content value="profiles">
              <VStack gap={6} align="stretch">
                {/* Создание нового профиля */}
                <Card.Root>
                  <Card.Header>
                    <SectionHeader
                      title="Создать профиль"
                      tooltip="Сохраните текущие настройки принтера как профиль для быстрого переключения"
                    />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Text fontSize="sm" color="fg.muted">
                        Сохраните текущие настройки принтера и этикетки как профиль
                      </Text>
                      <HStack gap={3}>
                        <Input
                          placeholder="Имя профиля (например: Мужская одежда)"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          flex={1}
                        />
                        <Button
                          colorPalette="blue"
                          onClick={handleSaveProfile}
                          loading={savingProfile}
                          loadingText="Сохранение..."
                          disabled={!newProfileName.trim()}
                        >
                          <LuPlus />
                          Создать профиль
                        </Button>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {/* Список профилей */}
                <Card.Root>
                  <Card.Header>
                    <SectionHeader
                      title="Сохранённые профили"
                      tooltip="Нажмите на профиль, чтобы применить его настройки"
                    />
                  </Card.Header>
                  <Card.Body>
                    {profiles.length === 0
                      ? (
                        <Text color="fg.muted" textAlign="center" py={4}>
                          Нет сохранённых профилей. Создайте первый профиль выше.
                        </Text>
                      )
                      : (
                        <VStack gap={3} align="stretch">
                          {profiles.map((profile) => (
                            <Box
                              key={profile.id}
                              p={4}
                              borderRadius="md"
                              border="1px solid"
                              borderColor="border.subtle"
                              _hover={{ bg: 'bg.subtle' }}
                            >
                              <HStack justify="space-between">
                                <VStack align="start" gap={1}>
                                  <Text fontWeight="medium">{profile.name}</Text>
                                  <HStack gap={4} fontSize="sm" color="fg.muted">
                                    <Text>
                                      Принтер: <strong>{profile.printerName}</strong>
                                    </Text>
                                    <Text>
                                      Скорость: <strong>{profile.printerSpeed}</strong>
                                    </Text>
                                    <Text>
                                      Плотность: <strong>{profile.printerDensity}</strong>
                                    </Text>
                                    <Text>
                                      Копии: <strong>{profile.copies}</strong>
                                    </Text>
                                  </HStack>
                                </VStack>
                                <HStack gap={2}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    colorPalette="blue"
                                    onClick={() => handleApplyProfile(profile)}
                                  >
                                    <LuSave />
                                    Применить
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    colorPalette="red"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                    loading={deletingProfileId === profile.id}
                                  >
                                    <LuTrash2 />
                                  </Button>
                                </HStack>
                              </HStack>
                            </Box>
                          ))}
                        </VStack>
                      )}
                  </Card.Body>
                </Card.Root>
              </VStack>
            </Tabs.Content>

            {/* Вкладка: О приложении */}
            <Tabs.Content value="about">
              <VStack gap={6} align="stretch">
                <Card.Root>
                  <Card.Header>
                    <SectionHeader title="О приложении" tooltip="Информация о версии и используемых технологиях" />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="start">
                      <Box>
                        <Text fontWeight="bold" color="fg.muted" fontSize="sm">
                          Название
                        </Text>
                        <Text fontSize="lg">Label Printer Desktop</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="fg.muted" fontSize="sm">
                          Версия
                        </Text>
                        <Text fontSize="lg">{APP_VERSION}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="fg.muted" fontSize="sm">
                          Описание
                        </Text>
                        <Text>Приложение для печати этикеток с кодами маркировки «Честный знак»</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="fg.muted" fontSize="sm">
                          Технологии
                        </Text>
                        <Text>Electron + Next.js + Chakra UI + ZenStack</Text>
                      </Box>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                {/* Обновления */}
                <Card.Root>
                  <Card.Header>
                    <SectionHeader title="Обновления" tooltip="Проверка и установка новых версий приложения" />
                  </Card.Header>
                  <Card.Body>
                    <VStack gap={4} align="stretch">
                      <Text fontSize="sm" color="fg.muted">
                        Проверьте наличие новых версий приложения
                      </Text>

                      {/* Статус обновления */}
                      {updateStatus?.available && !updateStatus.downloaded && (
                        <Box p={3} bg="blue.subtle" borderRadius="md">
                          <Text fontWeight="medium" color="blue.fg">
                            Доступна версия {updateStatus.version}
                          </Text>
                        </Box>
                      )}

                      {updateStatus
                        && updateStatus.progress !== null
                        && updateStatus.progress < 100
                        && !updateStatus.downloaded && (
                        <Box p={3} bg="orange.subtle" borderRadius="md">
                          <Text fontWeight="medium" color="orange.fg">
                            Загрузка обновления... {updateStatus.progress}%
                          </Text>
                        </Box>
                      )}

                      {updateStatus?.downloaded && (
                        <Box p={3} bg="green.subtle" borderRadius="md">
                          <Text fontWeight="medium" color="green.fg">
                            Обновление загружено и готово к установке
                          </Text>
                        </Box>
                      )}

                      {/* Кнопки действий */}
                      <HStack gap={3}>
                        {(!updateStatus || !updateStatus.available) && (
                          <Button
                            variant="outline"
                            colorPalette="blue"
                            onClick={handleCheckUpdate}
                            loading={checkingUpdate}
                            loadingText="Проверка..."
                          >
                            <LuRefreshCw />
                            Проверить обновления
                          </Button>
                        )}

                        {updateStatus?.available && !updateStatus.downloaded && (
                          <Button variant="solid" colorPalette="blue" onClick={handleDownloadUpdate}>
                            <LuDownload />
                            Загрузить
                          </Button>
                        )}

                        {updateStatus?.downloaded && (
                          <Button variant="solid" colorPalette="green" onClick={handleInstallUpdate}>
                            <LuCheck />
                            Установить и перезапустить
                          </Button>
                        )}
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </VStack>
            </Tabs.Content>

            {/* Ошибки и кнопка сохранения — вне вкладок */}
            <Box mt={6}>
              <Form.Errors />
              <Form.Button.Submit>Сохранить настройки</Form.Button.Submit>
            </Box>
          </Tabs.Root>
        </Form>
      </VStack>
    </Container>
  )
}
