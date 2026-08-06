'use client'

/**
 * Карточка настроек федерации трекеров
 *
 * Включает:
 * - Настройки федерации (включение, имя, ключи)
 * - Список трекеров с уровнями доверия
 * - Добавление трекеров через WebFinger
 * - Синхронизация контента
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Separator,
  Switch as ChakraSwitch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import {
  LuBan,
  LuCheck,
  LuGlobe,
  LuKey,
  LuLink,
  LuPlus,
  LuRefreshCw,
  LuRotateCw,
  LuSearch,
  LuSettings,
  LuShield,
  LuShieldCheck,
  LuShieldQuestion,
  LuTrash2,
  LuX,
} from 'react-icons/lu'

import type { TrustLevel } from '../../../../../shared/types/federation'
import { useFederation } from './use-federation'

/**
 * Форматирование даты
 */
function formatDate(isoString: string | null | undefined): string {
  if (!isoString) {
    return '—'
  }
  const date = new Date(isoString)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Получить цвет и имя для trust level
 */
function getTrustInfo(level: TrustLevel): { color: string; name: string; icon: typeof LuShield } {
  switch (level) {
    case 0:
      return { color: 'red', name: 'Заблокирован', icon: LuBan }
    case 1:
      return { color: 'gray', name: 'Не доверенный', icon: LuShieldQuestion }
    case 2:
      return { color: 'yellow', name: 'Известный', icon: LuShield }
    case 3:
      return { color: 'green', name: 'Доверенный', icon: LuShieldCheck }
    case 4:
      return { color: 'blue', name: 'Верифицированный', icon: LuShieldCheck }
    default:
      return { color: 'gray', name: 'Неизвестный', icon: LuShield }
  }
}

/**
 * Секция настроек
 */
function SettingsSection({
  settings,
  isGeneratingKeys,
  onUpdateSettings,
  onGenerateKeys,
}: {
  settings: ReturnType<typeof useFederation>['settings']
  isGeneratingKeys: boolean
  onUpdateSettings: ReturnType<typeof useFederation>['updateSettings']
  onGenerateKeys: ReturnType<typeof useFederation>['generateKeys']
}) {
  const [trackerName, setTrackerName] = useState(settings.data?.trackerName ?? '')

  // Синхронизация с settings когда они загружаются
  useEffect(() => {
    if (settings.data?.trackerName && !trackerName) {
      setTrackerName(settings.data.trackerName)
    }
  }, [settings.data?.trackerName, trackerName])

  const handleSaveName = () => {
    if (trackerName.trim() && trackerName !== settings.data?.trackerName) {
      void onUpdateSettings({ trackerName: trackerName.trim() })
    }
  }

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuSettings} color="purple.400" boxSize={5} />
        <Heading size="sm">Настройки</Heading>
      </HStack>

      {settings.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : settings.error
        ? <Text color="red.400">{settings.error}</Text>
        : (
          <VStack align="stretch" gap={4}>
            {/* Включение федерации */}
            <Flex justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Text fontSize="sm">Включить федерацию</Text>
                <Text fontSize="xs" color="fg.subtle">
                  Участвовать в сети трекеров для обмена контентом
                </Text>
              </VStack>
              <ChakraSwitch.Root
                checked={settings.data?.enabled ?? false}
                onCheckedChange={(e) => void onUpdateSettings({ enabled: e.checked })}
              >
                <ChakraSwitch.HiddenInput />
                <ChakraSwitch.Control />
              </ChakraSwitch.Root>
            </Flex>

            {/* Название трекера */}
            <Box>
              <Text fontSize="sm" color="fg.subtle" mb={2}>
                Название вашего трекера
              </Text>
              <HStack>
                <Input
                  size="sm"
                  value={trackerName}
                  onChange={(e) => setTrackerName(e.target.value)}
                  placeholder="My Animatrona"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveName}
                  disabled={!trackerName.trim() || trackerName === settings.data?.trackerName}
                >
                  Сохранить
                </Button>
              </HStack>
            </Box>

            {/* Ключи */}
            <Box>
              <Text fontSize="sm" color="fg.subtle" mb={2}>
                HTTP Signatures
              </Text>
              <HStack>
                {settings.data?.hasPrivateKey
                  ? (
                    <>
                      <Badge colorPalette="green">
                        <Icon as={LuCheck} mr={1} />
                        Ключи настроены
                      </Badge>
                      <Button size="sm" variant="outline" onClick={onGenerateKeys} loading={isGeneratingKeys}>
                        <Icon as={LuRefreshCw} mr={2} />
                        Перегенерировать
                      </Button>
                    </>
                  )
                  : (
                    <>
                      <Badge colorPalette="yellow">
                        <Icon as={LuKey} mr={1} />
                        Ключи не настроены
                      </Badge>
                      <Button size="sm" colorPalette="purple" onClick={onGenerateKeys} loading={isGeneratingKeys}>
                        <Icon as={LuKey} mr={2} />
                        Сгенерировать
                      </Button>
                    </>
                  )}
              </HStack>
              <Text fontSize="xs" color="fg.subtle" mt={1}>
                Ключи RSA-2048 для подписи запросов к другим трекерам
              </Text>
            </Box>

            {/* Автосинхронизация */}
            {settings.data?.enabled && (
              <>
                <Flex justify="space-between" align="center">
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm">Автосинхронизация</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Автоматически синхронизировать контент с доверенными трекерами
                    </Text>
                  </VStack>
                  <ChakraSwitch.Root
                    checked={settings.data?.autoSync ?? true}
                    onCheckedChange={(e) => void onUpdateSettings({ autoSync: e.checked })}
                  >
                    <ChakraSwitch.HiddenInput />
                    <ChakraSwitch.Control />
                  </ChakraSwitch.Root>
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text fontSize="sm">Интервал синхронизации (минут)</Text>
                  <Input
                    size="sm"
                    type="number"
                    w="80px"
                    min={15}
                    max={1440}
                    value={settings.data?.syncIntervalMinutes ?? 60}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (val >= 15 && val <= 1440) {
                        void onUpdateSettings({ syncIntervalMinutes: val })
                      }
                    }}
                  />
                </Flex>
              </>
            )}
          </VStack>
        )}
    </Box>
  )
}

/**
 * Секция обнаружения трекера
 */
function DiscoverySection({
  discovery,
  onDiscover,
  onClear,
  onAdd,
}: {
  discovery: ReturnType<typeof useFederation>['discovery']
  onDiscover: (url: string) => Promise<unknown>
  onClear: () => void
  onAdd: ReturnType<typeof useFederation>['addTracker']
}) {
  const [url, setUrl] = useState('')

  const handleDiscover = () => {
    if (url.trim()) {
      void onDiscover(url.trim())
    }
  }

  const handleAdd = async () => {
    if (discovery.result && !discovery.result.alreadyAdded) {
      const added = await onAdd({
        url: discovery.result.url,
        trustLevel: 1, // UNTRUSTED по умолчанию
      })
      if (added) {
        onClear()
        setUrl('')
      }
    }
  }

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuSearch} color="blue.400" boxSize={5} />
        <Heading size="sm">Добавить трекер</Heading>
      </HStack>

      <VStack align="stretch" gap={3}>
        <HStack>
          <Input
            size="sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tracker.example.com"
          />
          <Button size="sm" colorPalette="blue" onClick={handleDiscover} loading={discovery.isLoading}>
            <Icon as={LuSearch} mr={2} />
            Найти
          </Button>
        </HStack>

        {discovery.error && (
          <Text color="red.400" fontSize="sm">
            {discovery.error}
          </Text>
        )}

        {discovery.result && (
          <Box p={3} bg="bg.subtle" borderRadius="md">
            <Flex justify="space-between" align="flex-start" mb={2}>
              <VStack align="start" gap={1}>
                <Text fontWeight="medium">{discovery.result.actor.name}</Text>
                <Text fontSize="xs" color="fg.subtle">
                  {discovery.result.url}
                </Text>
              </VStack>
              {discovery.result.alreadyAdded
                ? (
                  <Badge colorPalette="gray">
                    <Icon as={LuCheck} mr={1} />
                    Уже добавлен
                  </Badge>
                )
                : (
                  <Button size="xs" colorPalette="green" onClick={handleAdd}>
                    <Icon as={LuPlus} mr={1} />
                    Добавить
                  </Button>
                )}
            </Flex>
            {discovery.result.actor.summary && (
              <Text fontSize="sm" color="fg.muted">
                {discovery.result.actor.summary}
              </Text>
            )}
            <HStack mt={2} gap={2}>
              <Badge size="xs">{discovery.result.actor['animatrona:metadata']?.theme || 'anime'}</Badge>
              <Badge size="xs">{discovery.result.actor['animatrona:metadata']?.language || 'ru'}</Badge>
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  )
}

/**
 * Секция списка трекеров
 */
function TrackersSection({
  trackers,
  sync,
  federationEnabled,
  onRefresh,
  onRemove,
  onSetTrust,
  onBlock,
  onUnblock,
  onSync,
  onSyncAll,
}: {
  trackers: ReturnType<typeof useFederation>['trackers']
  sync: ReturnType<typeof useFederation>['sync']
  federationEnabled: boolean
  onRefresh: (id: string) => Promise<boolean>
  onRemove: (id: string) => Promise<boolean>
  onSetTrust: (id: string, level: TrustLevel) => Promise<boolean>
  onBlock: (id: string) => Promise<boolean>
  onUnblock: (id: string) => Promise<boolean>
  onSync: ReturnType<typeof useFederation>['syncTracker']
  onSyncAll: ReturnType<typeof useFederation>['syncAll']
}) {
  return (
    <Box>
      <HStack mb={4} gap={3} justify="space-between">
        <HStack gap={3}>
          <Icon as={LuGlobe} color="green.400" boxSize={5} />
          <Heading size="sm">Трекеры</Heading>
          <Badge size="sm">{trackers.list.length}</Badge>
        </HStack>
        {federationEnabled && trackers.list.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => void onSyncAll()}
            loading={sync.isSyncing}
          >
            <Icon as={LuRotateCw} mr={1} />
            Синхронизировать все
          </Button>
        )}
      </HStack>

      {!federationEnabled
        ? <Text color="fg.subtle">Включите федерацию для управления трекерами</Text>
        : trackers.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : trackers.error
        ? <Text color="red.400">{trackers.error}</Text>
        : trackers.list.length === 0
        ? (
          <Text color="fg.subtle" fontSize="sm">
            Нет добавленных трекеров. Используйте поиск выше, чтобы найти и добавить трекер.
          </Text>
        )
        : (
          <VStack align="stretch" gap={3}>
            {trackers.list.map((tracker) => {
              const trustInfo = getTrustInfo(tracker.trustLevel)
              const isSyncing = sync.isSyncing && sync.syncingTrackerId === tracker.id
              const isBlocked = tracker.trustLevel === 0

              return (
                <Box key={tracker.id} p={3} bg="bg.subtle" borderRadius="md">
                  <Flex justify="space-between" align="flex-start" mb={2}>
                    <VStack align="start" gap={1}>
                      <HStack>
                        <Text fontWeight="medium">{tracker.name}</Text>
                        <Badge colorPalette={trustInfo.color} size="xs">
                          <Icon as={trustInfo.icon} mr={1} />
                          {trustInfo.name}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="fg.subtle" maxW="300px" truncate>
                        {tracker.url}
                      </Text>
                    </VStack>
                    <HStack gap={1}>
                      {!isBlocked && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          onClick={() => void onSync(tracker.id)}
                          loading={isSyncing}
                          aria-label="Синхронизировать"
                        >
                          <LuRotateCw />
                        </IconButton>
                      )}
                      <IconButton
                        size="xs"
                        variant="ghost"
                        onClick={() => void onRefresh(tracker.id)}
                        aria-label="Обновить"
                      >
                        <LuRefreshCw />
                      </IconButton>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => void onRemove(tracker.id)}
                        aria-label="Удалить"
                      >
                        <LuTrash2 />
                      </IconButton>
                    </HStack>
                  </Flex>

                  {/* Статистика */}
                  <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={2}>
                    <Box p={2} bg="bg.muted" borderRadius="sm">
                      <Text fontSize="xs" color="fg.subtle">
                        Uptime
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {tracker.metrics.uptimePercent?.toFixed(0) ?? 0}%
                      </Text>
                    </Box>
                    <Box p={2} bg="bg.muted" borderRadius="sm">
                      <Text fontSize="xs" color="fg.subtle">
                        Отклик
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {tracker.metrics.avgResponseTimeMs ?? 0}ms
                      </Text>
                    </Box>
                    <Box p={2} bg="bg.muted" borderRadius="sm">
                      <Text fontSize="xs" color="fg.subtle">
                        Синхронизировано
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {tracker.contentSynced ?? 0}
                      </Text>
                    </Box>
                    <Box p={2} bg="bg.muted" borderRadius="sm">
                      <Text fontSize="xs" color="fg.subtle">
                        Качество
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {((tracker.metrics.contentQuality ?? 0) * 100).toFixed(0)}%
                      </Text>
                    </Box>
                  </Grid>

                  {/* Управление доверием */}
                  <Flex justify="space-between" align="center">
                    <Text fontSize="xs" color="fg.subtle">
                      Последняя проверка: {formatDate(tracker.metrics.lastCheckedAt)}
                    </Text>
                    <HStack gap={1}>
                      {isBlocked
                        ? (
                          <Button size="xs" variant="outline" onClick={() => void onUnblock(tracker.id)}>
                            Разблокировать
                          </Button>
                        )
                        : (
                          <>
                            {/* Кнопки смены уровня доверия */}
                            {tracker.trustLevel < 3 && (
                              <Button
                                size="xs"
                                variant="ghost"
                                colorPalette="green"
                                onClick={() => void onSetTrust(tracker.id, (tracker.trustLevel + 1) as TrustLevel)}
                              >
                                Повысить
                              </Button>
                            )}
                            {tracker.trustLevel > 1 && (
                              <Button
                                size="xs"
                                variant="ghost"
                                colorPalette="orange"
                                onClick={() => void onSetTrust(tracker.id, (tracker.trustLevel - 1) as TrustLevel)}
                              >
                                Понизить
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => void onBlock(tracker.id)}
                            >
                              <Icon as={LuBan} mr={1} />
                              Блок
                            </Button>
                          </>
                        )}
                    </HStack>
                  </Flex>
                </Box>
              )
            })}
          </VStack>
        )}
    </Box>
  )
}

/**
 * Секция результатов синхронизации
 */
function SyncResultsSection({ sync }: { sync: ReturnType<typeof useFederation>['sync'] }) {
  if (sync.lastResults.length === 0) {
    return null
  }

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuRotateCw} color="cyan.400" boxSize={5} />
        <Heading size="sm">Последние синхронизации</Heading>
      </HStack>

      <VStack align="stretch" gap={2}>
        {sync.lastResults.slice(0, 5).map((result, idx) => (
          <Box key={idx} p={2} bg="bg.subtle" borderRadius="md">
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="medium" maxW="200px" truncate>
                {result.tracker}
              </Text>
              <HStack gap={2}>
                {result.imported > 0 && (
                  <Badge colorPalette="green" size="xs">
                    +{result.imported}
                  </Badge>
                )}
                {result.updated > 0 && (
                  <Badge colorPalette="blue" size="xs">
                    ~{result.updated}
                  </Badge>
                )}
                {result.skipped > 0 && (
                  <Badge colorPalette="gray" size="xs">
                    ={result.skipped}
                  </Badge>
                )}
                {result.errors.length > 0 && (
                  <Badge colorPalette="red" size="xs">
                    <Icon as={LuX} mr={1} />
                    {result.errors.length}
                  </Badge>
                )}
              </HStack>
            </Flex>
            <Text fontSize="xs" color="fg.subtle">
              {formatDate(result.syncedAt)}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

/**
 * Основная карточка федерации
 */
export function FederationCard() {
  const {
    settings,
    updateSettings,
    generateKeys,
    isGeneratingKeys,
    trackers,
    discovery,
    discoverTracker,
    clearDiscovery,
    addTracker,
    removeTracker,
    refreshTracker,
    setTrustLevel,
    blockTracker,
    unblockTracker,
    sync,
    syncTracker,
    syncAll,
  } = useFederation()

  const federationEnabled = settings.data?.enabled ?? false

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <Icon as={LuLink} color="purple.400" boxSize={5} />
          <Heading size="md">Федерация трекеров</Heading>
          <Badge colorPalette={federationEnabled ? 'green' : 'gray'} size="sm">
            {federationEnabled ? 'Активна' : 'Отключена'}
          </Badge>
        </HStack>
        <Text fontSize="sm" color="fg.subtle" mt={1}>
          Обменивайтесь контентом с другими Animatrona трекерами через ActivityPub
        </Text>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={6}>
          {/* Настройки */}
          <SettingsSection
            settings={settings}
            isGeneratingKeys={isGeneratingKeys}
            onUpdateSettings={updateSettings}
            onGenerateKeys={generateKeys}
          />

          {federationEnabled && (
            <>
              <Separator />

              {/* Поиск трекера */}
              <DiscoverySection
                discovery={discovery}
                onDiscover={discoverTracker}
                onClear={clearDiscovery}
                onAdd={addTracker}
              />

              <Separator />

              {/* Список трекеров */}
              <TrackersSection
                trackers={trackers}
                sync={sync}
                federationEnabled={federationEnabled}
                onRefresh={refreshTracker}
                onRemove={removeTracker}
                onSetTrust={setTrustLevel}
                onBlock={blockTracker}
                onUnblock={unblockTracker}
                onSync={syncTracker}
                onSyncAll={syncAll}
              />

              {/* Результаты синхронизации */}
              {sync.lastResults.length > 0 && (
                <>
                  <Separator />
                  <SyncResultsSection sync={sync} />
                </>
              )}
            </>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
