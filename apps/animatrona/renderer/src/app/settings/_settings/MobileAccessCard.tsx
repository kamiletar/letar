'use client'

/**
 * Карточка настроек мобильного доступа
 *
 * Позволяет включить HTTP сервер для просмотра аниме с телефона
 * в локальной сети. Показывает QR-код для быстрого подключения.
 */

import { Box, Card, Heading, HStack, Image, Spinner, Switch, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuRefreshCw, LuSmartphone, LuWifi } from 'react-icons/lu'

import { useUpsertSettings } from '@/lib/hooks'
import type { MobileServerStatus } from '@/types/electron'

/**
 * Настройки мобильного доступа
 */
export function MobileAccessCard() {
  const [status, setStatus] = useState<MobileServerStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  const { mutateAsync: upsertSettings } = useUpsertSettings()

  // Загрузка статуса при монтировании
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    if (!window.electronAPI?.mobileServer) {
      setIsLoading(false)
      return
    }

    try {
      const currentStatus = await window.electronAPI.mobileServer.getStatus()
      setStatus(currentStatus)

      if (currentStatus.isRunning) {
        const qr = await window.electronAPI.mobileServer.getQRCode()
        setQrCode(qr)
      } else {
        setQrCode(null)
      }
    } catch (error) {
      console.error('Failed to load mobile server status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      if (!window.electronAPI?.mobileServer) {
        return
      }

      setIsToggling(true)
      try {
        if (enabled) {
          const newStatus = await window.electronAPI.mobileServer.start()
          setStatus(newStatus)
          const qr = await window.electronAPI.mobileServer.getQRCode()
          setQrCode(qr)
        } else {
          await window.electronAPI.mobileServer.stop()
          setStatus(await window.electronAPI.mobileServer.getStatus())
          setQrCode(null)
        }

        // Сохраняем настройку в БД для автозапуска при следующем старте
        await upsertSettings({
          create: { mobileAccessEnabled: enabled },
          update: { mobileAccessEnabled: enabled },
        })
        console.warn('[MobileAccessCard] Настройка сохранена:', enabled)
      } catch (error) {
        console.error('Failed to toggle mobile server:', error)
      } finally {
        setIsToggling(false)
      }
    },
    [upsertSettings],
  )

  const handleRefreshIp = useCallback(async () => {
    if (!window.electronAPI?.mobileServer) {
      return
    }

    try {
      const newStatus = await window.electronAPI.mobileServer.refreshIp()
      setStatus(newStatus)
      if (newStatus.isRunning) {
        const qr = await window.electronAPI.mobileServer.getQRCode()
        setQrCode(qr)
      }
    } catch (error) {
      console.error('Failed to refresh IP:', error)
    }
  }, [])

  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuSmartphone size={20} color="var(--chakra-colors-purple-400)" />
            <Heading size="md">Мобильный доступ</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
            <Text color="fg.subtle">Загрузка...</Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuSmartphone size={20} color="var(--chakra-colors-purple-400)" />
          <Heading size="md">Мобильный доступ</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Переключатель */}
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="medium">Включить мобильный сервер</Text>
              <Text fontSize="sm" color="fg.subtle">
                Позволяет смотреть аниме с телефона в локальной сети
              </Text>
            </Box>
            <Switch.Root
              checked={status?.isRunning ?? false}
              disabled={isToggling}
              onCheckedChange={(details) => handleToggle(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>

          {/* Информация о подключении */}
          {status?.isRunning && (
            <>
              {/* URL и статус */}
              <Box bg="bg.subtle" borderRadius="lg" p={4}>
                <VStack gap={3} align="stretch">
                  <HStack gap={2}>
                    <LuWifi size={16} color="var(--chakra-colors-green-400)" />
                    <Text fontWeight="medium" color="green.400">
                      Сервер запущен
                    </Text>
                  </HStack>

                  <Box>
                    <Text fontSize="sm" color="fg.subtle" mb={1}>
                      Адрес для подключения:
                    </Text>
                    <Text fontFamily="mono" fontSize="lg" fontWeight="bold" color="purple.400" userSelect="all">
                      {status.url}
                    </Text>
                  </Box>

                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.subtle">
                      Порт: {status.port} • Запросов: {status.requestCount}
                    </Text>
                    <Box
                      as="button"
                      display="flex"
                      alignItems="center"
                      gap={1}
                      color="fg.subtle"
                      fontSize="sm"
                      onClick={handleRefreshIp}
                      _hover={{ color: 'fg' }}
                    >
                      <LuRefreshCw size={12} />
                      Обновить IP
                    </Box>
                  </HStack>

                  {/* Все доступные IP адреса */}
                  {status.allIps && status.allIps.length > 1 && (
                    <Box>
                      <Text fontSize="sm" color="fg.subtle" mb={2}>
                        Все доступные адреса:
                      </Text>
                      <VStack gap={1} align="stretch">
                        {status.allIps.map((ipInfo) => (
                          <HStack key={ipInfo.ip} justify="space-between">
                            <Text
                              fontFamily="mono"
                              fontSize="sm"
                              color={ipInfo.type === 'lan'
                                ? 'green.400'
                                : ipInfo.type === 'vpn'
                                ? 'yellow.400'
                                : 'fg.subtle'}
                              userSelect="all"
                            >
                              http://{ipInfo.ip}:{status.port}
                            </Text>
                            <Text fontSize="xs" color="fg.subtle">
                              {ipInfo.type === 'lan' ? '📶 LAN' : ipInfo.type === 'vpn' ? '🔒 VPN' : '🌐'}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </Box>

              {/* QR-код */}
              {qrCode && (
                <VStack gap={3}>
                  <Text fontSize="sm" color="fg.subtle" textAlign="center">
                    Отсканируйте QR-код камерой телефона:
                  </Text>
                  <Box bg="white" p={4} borderRadius="xl" shadow="lg" alignSelf="center">
                    <Image src={qrCode} alt="QR-код для подключения" width="200px" height="200px" />
                  </Box>
                </VStack>
              )}

              {/* Инструкция */}
              <Box bg="blue.950" borderRadius="lg" p={4} borderLeft="4px solid" borderColor="blue.400">
                <Text fontSize="sm" color="blue.200">
                  <strong>Подсказка:</strong>{' '}
                  Телефон должен быть подключён к той же Wi-Fi сети, что и компьютер. Откройте камеру и наведите на
                  QR-код или введите адрес вручную в браузере.
                </Text>
              </Box>
            </>
          )}

          {/* Когда сервер выключен */}
          {!status?.isRunning && (
            <Box bg="bg.subtle" borderRadius="lg" p={4}>
              <Text fontSize="sm" color="fg.subtle" textAlign="center">
                Включите сервер, чтобы смотреть аниме с телефона
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
