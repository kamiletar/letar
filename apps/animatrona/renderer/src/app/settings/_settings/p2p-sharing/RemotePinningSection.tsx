'use client'

/**
 * Секция Remote Pinning (Pinata)
 */

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuCloud, LuEye, LuEyeOff, LuRefreshCw, LuX } from 'react-icons/lu'

import type { useP2PSharing } from '../use-p2p-sharing'
import { formatBytes } from './format-utils'

interface RemotePinningSectionProps {
  remotePin: ReturnType<typeof useP2PSharing>['remotePin']
  onUpdateConfig: (updates: { enabled?: boolean; jwt?: string }) => Promise<void>
  onTestAuth: (jwt: string) => Promise<boolean>
  onRefreshPins: () => Promise<void>
  onRefreshStats: () => Promise<void>
}

export function RemotePinningSection({
  remotePin,
  onUpdateConfig,
  onTestAuth,
  onRefreshPins,
  onRefreshStats,
}: RemotePinningSectionProps) {
  const [showJwt, setShowJwt] = useState(false)
  const [jwtInput, setJwtInput] = useState('')
  const [jwtValid, setJwtValid] = useState<boolean | null>(null)

  const config = remotePin.config
  const isConfigured = config?.pinata.jwt === '***configured***'

  const handleTestJwt = async () => {
    if (!jwtInput.trim()) {
      return
    }
    const valid = await onTestAuth(jwtInput.trim())
    setJwtValid(valid)
    if (valid) {
      // Сохраняем JWT при успешной проверке
      await onUpdateConfig({ jwt: jwtInput.trim(), enabled: true })
      setJwtInput('')
    }
  }

  const handleClearJwt = async () => {
    await onUpdateConfig({ jwt: '', enabled: false })
    setJwtValid(null)
    setJwtInput('')
  }

  return (
    <Box>
      <HStack mb={4} gap={3} justify="space-between">
        <HStack gap={3}>
          <Icon as={LuCloud} color="pink.400" boxSize={5} />
          <Heading size="sm">Remote Pinning (Pinata)</Heading>
          <Badge colorPalette={isConfigured ? 'green' : 'gray'} size="sm">
            {isConfigured ? 'Настроено' : 'Не настроено'}
          </Badge>
        </HStack>
        {isConfigured && (
          <IconButton size="xs" variant="ghost" onClick={onRefreshStats} aria-label="Обновить статистику">
            <LuRefreshCw />
          </IconButton>
        )}
      </HStack>

      {remotePin.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : remotePin.error
        ? <Text color="red.400">{remotePin.error}</Text>
        : (
          <VStack align="stretch" gap={4}>
            {/* Настройка JWT */}
            <Box>
              <Text fontSize="sm" color="fg.subtle" mb={2}>
                Pinata JWT Token
              </Text>
              {isConfigured
                ? (
                  <HStack>
                    <Input size="sm" type="password" value="••••••••••••••••••••" disabled flex={1} />
                    <Button size="sm" variant="outline" colorPalette="red" onClick={handleClearJwt}>
                      Очистить
                    </Button>
                  </HStack>
                )
                : (
                  <VStack align="stretch" gap={2}>
                    <HStack>
                      <Input
                        size="sm"
                        type={showJwt ? 'text' : 'password'}
                        value={jwtInput}
                        onChange={(e) => {
                          setJwtInput(e.target.value)
                          setJwtValid(null)
                        }}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        flex={1}
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowJwt(!showJwt)}
                        aria-label={showJwt ? 'Скрыть' : 'Показать'}
                      >
                        {showJwt ? <LuEyeOff /> : <LuEye />}
                      </IconButton>
                    </HStack>
                    <HStack>
                      <Button
                        size="sm"
                        colorPalette="pink"
                        onClick={handleTestJwt}
                        loading={remotePin.isTestingAuth}
                        disabled={!jwtInput.trim()}
                      >
                        Проверить и сохранить
                      </Button>
                      {jwtValid === true && (
                        <Badge colorPalette="green">
                          <Icon as={LuCheck} mr={1} />
                          Верный
                        </Badge>
                      )}
                      {jwtValid === false && (
                        <Badge colorPalette="red">
                          <Icon as={LuX} mr={1} />
                          Неверный
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                )}
              <Text fontSize="xs" color="fg.subtle" mt={2}>
                Получите JWT на{' '}
                <Text as="span" color="pink.400">
                  pinata.cloud/keys
                </Text>
              </Text>
            </Box>

            {/* Статистика */}
            {isConfigured && remotePin.stats && (
              <Box>
                <Text fontSize="sm" color="fg.subtle" mb={2}>
                  Статистика
                </Text>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <Text fontSize="xs" color="fg.subtle">
                      Пинов
                    </Text>
                    <Text fontWeight="semibold">{remotePin.stats.totalPins}</Text>
                  </Box>
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <Text fontSize="xs" color="fg.subtle">
                      Размер
                    </Text>
                    <Text fontWeight="semibold">{formatBytes(remotePin.stats.totalSize)}</Text>
                  </Box>
                  <Box p={3} bg="bg.subtle" borderRadius="md">
                    <Text fontSize="xs" color="fg.subtle">
                      Лимит
                    </Text>
                    <Text fontWeight="semibold">{formatBytes(remotePin.stats.pinSizeLimit)}</Text>
                  </Box>
                </Grid>
              </Box>
            )}

            {/* Список пинов */}
            {isConfigured && remotePin.pins.length > 0 && (
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="fg.subtle">
                    Закреплённые CID
                  </Text>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    onClick={onRefreshPins}
                    loading={remotePin.isLoading}
                    aria-label="Обновить список"
                  >
                    <LuRefreshCw />
                  </IconButton>
                </HStack>
                <VStack align="stretch" gap={2} maxH="200px" overflow="auto">
                  {remotePin.pins.slice(0, 10).map((pin) => (
                    <Box key={pin.id} p={2} bg="bg.subtle" borderRadius="md">
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {pin.name || 'Без имени'}
                          </Text>
                          <Text fontFamily="mono" fontSize="xs" color="fg.subtle" maxW="200px" truncate>
                            {pin.cid}
                          </Text>
                        </VStack>
                        <Badge size="xs" colorPalette={pin.status === 'pinned' ? 'green' : 'yellow'}>
                          {pin.status}
                        </Badge>
                      </Flex>
                    </Box>
                  ))}
                  {remotePin.pins.length > 10 && (
                    <Text fontSize="xs" color="fg.subtle" textAlign="center">
                      И ещё {remotePin.pins.length - 10} пинов...
                    </Text>
                  )}
                </VStack>
              </Box>
            )}
          </VStack>
        )}
    </Box>
  )
}
