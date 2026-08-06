'use client'

/**
 * Секция планировщика автообновления подписок
 */

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Switch as ChakraSwitch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { LuPause, LuPlay, LuRefreshCw, LuRss } from 'react-icons/lu'

import type { useP2PSharing } from '../use-p2p-sharing'
import { formatDate } from './format-utils'

interface SchedulerSectionProps {
  scheduler: ReturnType<typeof useP2PSharing>['scheduler']
  ipfsRunning: boolean
  onUpdateConfig: (updates: {
    enabled?: boolean
    intervalMinutes?: number
    showNotifications?: boolean
    autoPinEnabled?: boolean
  }) => Promise<void>
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  onCheckNow: () => Promise<void>
}

export function SchedulerSection({
  scheduler,
  ipfsRunning,
  onUpdateConfig,
  onStart,
  onStop,
  onCheckNow,
}: SchedulerSectionProps) {
  const isRunning = scheduler.status?.isRunning ?? false
  const config = scheduler.status?.config

  return (
    <Box>
      <HStack mb={4} gap={3}>
        <Icon as={LuRss} color="orange.400" boxSize={5} />
        <Heading size="sm">Автообновление</Heading>
        <Badge colorPalette={config?.enabled ? 'green' : 'gray'} size="sm">
          {config?.enabled ? 'Активно' : 'Отключено'}
        </Badge>
      </HStack>

      {!ipfsRunning
        ? <Text color="fg.subtle">Запустите IPFS ноду для настройки автообновления</Text>
        : scheduler.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : (
          <VStack align="stretch" gap={4}>
            {/* Переключатели */}
            <Flex justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Text fontSize="sm">Включить автообновление</Text>
                <Text fontSize="xs" color="fg.subtle">
                  Автоматически проверять подписки на новый контент
                </Text>
              </VStack>
              <ChakraSwitch.Root
                checked={config?.enabled ?? false}
                onCheckedChange={(e) => {
                  void onUpdateConfig({ enabled: e.checked }).then(() => {
                    // Автозапуск/остановка при изменении enabled
                    if (e.checked && !isRunning) {
                      void onStart()
                    } else if (!e.checked && isRunning) {
                      void onStop()
                    }
                  })
                }}
              >
                <ChakraSwitch.HiddenInput />
                <ChakraSwitch.Control />
              </ChakraSwitch.Root>
            </Flex>

            {config?.enabled && (
              <>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm">Интервал проверки (минут)</Text>
                  <Input
                    size="sm"
                    type="number"
                    w="80px"
                    min={5}
                    max={1440}
                    value={config?.intervalMinutes ?? 60}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (val >= 5 && val <= 1440) {
                        void onUpdateConfig({ intervalMinutes: val })
                      }
                    }}
                  />
                </Flex>

                <Flex justify="space-between" align="center">
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm">Показывать уведомления</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Уведомлять о новом контенте в подписках
                    </Text>
                  </VStack>
                  <ChakraSwitch.Root
                    checked={config?.showNotifications ?? true}
                    onCheckedChange={(e) => void onUpdateConfig({ showNotifications: e.checked })}
                  >
                    <ChakraSwitch.HiddenInput />
                    <ChakraSwitch.Control />
                  </ChakraSwitch.Root>
                </Flex>

                <Flex justify="space-between" align="center">
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm">Автоматический пининг</Text>
                    <Text fontSize="xs" color="fg.subtle">
                      Автоматически закреплять новый контент
                    </Text>
                  </VStack>
                  <ChakraSwitch.Root
                    checked={config?.autoPinEnabled ?? true}
                    onCheckedChange={(e) => void onUpdateConfig({ autoPinEnabled: e.checked })}
                  >
                    <ChakraSwitch.HiddenInput />
                    <ChakraSwitch.Control />
                  </ChakraSwitch.Root>
                </Flex>
              </>
            )}

            {/* Последняя проверка */}
            {scheduler.status?.lastCheckAt && (
              <Text fontSize="xs" color="fg.subtle">
                Последняя проверка: {formatDate(scheduler.status.lastCheckAt)}
              </Text>
            )}

            {/* Кнопки управления */}
            <HStack>
              {isRunning
                ? (
                  <Button size="sm" variant="outline" colorPalette="orange" onClick={onStop}>
                    <Icon as={LuPause} mr={2} />
                    Приостановить
                  </Button>
                )
                : (
                  <Button size="sm" colorPalette="orange" onClick={onStart} disabled={!config?.enabled}>
                    <Icon as={LuPlay} mr={2} />
                    Запустить
                  </Button>
                )}
              <Button size="sm" variant="outline" onClick={onCheckNow}>
                <Icon as={LuRefreshCw} mr={2} />
                Проверить сейчас
              </Button>
            </HStack>
          </VStack>
        )}
    </Box>
  )
}
