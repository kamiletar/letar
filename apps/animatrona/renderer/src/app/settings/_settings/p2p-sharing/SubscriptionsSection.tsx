'use client'

/**
 * Секция подписок на библиотеки других пользователей
 */

import { Badge, Box, Button, Flex, Heading, HStack, Icon, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuExternalLink, LuPlus, LuRefreshCw, LuTrash2, LuUsers } from 'react-icons/lu'

import { useRouter } from 'next/navigation'
import type { useP2PSharing } from '../use-p2p-sharing'
import { formatDate } from './format-utils'

interface SubscriptionsSectionProps {
  subscriptions: ReturnType<typeof useP2PSharing>['subscriptions']
  ipfsRunning: boolean
  onAdd: (data: { ipnsName: string; displayName: string }) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
  onRefresh: (id: string) => Promise<unknown>
  onRefreshAll: () => Promise<void>
}

export function SubscriptionsSection({
  subscriptions,
  ipfsRunning,
  onAdd,
  onRemove,
  onRefresh,
  onRefreshAll,
}: SubscriptionsSectionProps) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIpnsName, setNewIpnsName] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')

  const handleAdd = async () => {
    if (newIpnsName.trim() && newDisplayName.trim()) {
      await onAdd({ ipnsName: newIpnsName.trim(), displayName: newDisplayName.trim() })
      setNewIpnsName('')
      setNewDisplayName('')
      setShowAddForm(false)
    }
  }

  return (
    <Box>
      <HStack mb={4} gap={3} justify="space-between">
        <HStack gap={3}>
          <Icon as={LuUsers} color="green.400" boxSize={5} />
          <Heading size="sm">Подписки</Heading>
          <Badge size="sm">{subscriptions.list.length}</Badge>
        </HStack>
        {ipfsRunning && (
          <HStack>
            <IconButton
              size="xs"
              variant="ghost"
              onClick={onRefreshAll}
              loading={subscriptions.isRefreshing}
              aria-label="Обновить все"
            >
              <LuRefreshCw />
            </IconButton>
            <IconButton size="xs" variant="ghost" onClick={() => setShowAddForm(!showAddForm)} aria-label="Добавить">
              <LuPlus />
            </IconButton>
          </HStack>
        )}
      </HStack>

      {!ipfsRunning
        ? <Text color="fg.subtle">Запустите IPFS ноду для управления подписками</Text>
        : subscriptions.isLoading
        ? <Text color="fg.subtle">Загрузка...</Text>
        : (
          <VStack align="stretch" gap={3}>
            {/* Форма добавления */}
            {showAddForm && (
              <Box p={3} bg="bg.subtle" borderRadius="md">
                <VStack align="stretch" gap={2}>
                  <Input
                    size="sm"
                    value={newIpnsName}
                    onChange={(e) => setNewIpnsName(e.target.value)}
                    placeholder="IPNS адрес (PeerId)"
                  />
                  <Input
                    size="sm"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Отображаемое имя"
                  />
                  <HStack justify="flex-end">
                    <Button size="xs" variant="ghost" onClick={() => setShowAddForm(false)}>
                      Отмена
                    </Button>
                    <Button
                      size="xs"
                      colorPalette="green"
                      onClick={handleAdd}
                      disabled={!newIpnsName.trim() || !newDisplayName.trim()}
                    >
                      Добавить
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Список подписок */}
            {subscriptions.list.length === 0
              ? (
                <Text color="fg.subtle" fontSize="sm">
                  Нет подписок. Добавьте первую подписку, чтобы следить за библиотекой другого пользователя.
                </Text>
              )
              : (
                subscriptions.list.map((sub) => (
                  <Box key={sub.id} p={3} bg="bg.subtle" borderRadius="md">
                    <Flex justify="space-between" align="flex-start" mb={2}>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium">{sub.displayName}</Text>
                        <Text fontFamily="mono" fontSize="xs" color="fg.subtle" maxW="200px" truncate>
                          {sub.ipnsName}
                        </Text>
                      </VStack>
                      <HStack gap={1}>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          onClick={() => router.push(`/subscriptions/${sub.id}`)}
                          aria-label="Просмотреть библиотеку"
                        >
                          <LuExternalLink />
                        </IconButton>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          onClick={() => void onRefresh(sub.id)}
                          aria-label="Обновить"
                        >
                          <LuRefreshCw />
                        </IconButton>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => void onRemove(sub.id)}
                          aria-label="Удалить"
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    </Flex>
                    <Flex justify="space-between" fontSize="xs" color="fg.subtle">
                      <Text>Проверено: {formatDate(sub.lastCheckedAt)}</Text>
                      <HStack gap={2}>{sub.autoPin && <Badge size="xs">Auto-pin</Badge>}</HStack>
                    </Flex>
                  </Box>
                ))
              )}
          </VStack>
        )}
    </Box>
  )
}
