/**
 * Страница друзей
 *
 * Отображает список друзей, запросы в друзья и социальные функции.
 */

'use client'

import { Badge, Box, Button, Heading, HStack, Spinner, Tabs, Text, VStack } from '@chakra-ui/react'
import { LuInbox, LuSend, LuUserCheck, LuUsers } from 'react-icons/lu'

import { Header } from '@/components/layout'
import { toaster } from '@/components/ui/toaster'

import { FriendsList } from '../../components/social/friends/FriendsList'
import { useFriendRequests } from '../../hooks/useFriendRequests'
import { useFriends } from '../../hooks/useFriends'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

/**
 * Страница друзей и социальных функций
 */
export default function FriendsPage() {
  const { friends } = useFriends()
  const { incomingRequests, outgoingRequests, isLoading, error, acceptRequest, rejectRequest } = useFriendRequests()

  // Счётчики для бейджей
  const onlineFriendsCount = friends.filter((f) => f.isOnline).length
  const incomingCount = incomingRequests.length

  // Обработка запроса
  const handleAcceptRequest = async (requestId: string) => {
    const request = incomingRequests.find((r) => r.id === requestId)
    const success = await acceptRequest(requestId)

    if (success) {
      toaster.success({
        title: 'Запрос принят',
        description: request?.fromDisplayName,
      })
    } else {
      toaster.error({ title: 'Не удалось принять запрос' })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const success = await rejectRequest(requestId)

    if (success) {
      toaster.success({ title: 'Запрос отклонён' })
    } else {
      toaster.error({ title: 'Не удалось отклонить запрос' })
    }
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Друзья" />

      <Box p={6}>
        <Tabs.Root defaultValue="friends" variant="line" lazyMount>
          <Tabs.List>
            <Tabs.Trigger value="friends">
              <LuUsers />
              Друзья
              {onlineFriendsCount > 0 && (
                <Badge colorPalette="green" ml={2}>
                  {onlineFriendsCount} онлайн
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="incoming">
              <LuInbox />
              Входящие
              {incomingCount > 0 && (
                <Badge colorPalette="blue" ml={2}>
                  {incomingCount}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="outgoing">
              <LuSend />
              Исходящие
            </Tabs.Trigger>
          </Tabs.List>

          {/* Вкладка: Друзья */}
          <Tabs.Content value="friends">
            <Box py={6} maxW="800px">
              <FriendsList />
            </Box>
          </Tabs.Content>

          {/* Вкладка: Входящие запросы */}
          <Tabs.Content value="incoming">
            <Box py={6} maxW="800px">
              <Heading size="md" mb={4}>
                <HStack>
                  <LuInbox />
                  <Text>Входящие запросы</Text>
                </HStack>
              </Heading>

              {isLoading
                ? (
                  <VStack py={8}>
                    <Spinner />
                    <Text color="fg.muted">Загрузка...</Text>
                  </VStack>
                )
                : error
                ? <Text color="red.500">{error}</Text>
                : incomingRequests.length === 0
                ? (
                  <VStack py={8} color="fg.muted">
                    <LuInbox size={48} />
                    <Text>Нет входящих запросов</Text>
                  </VStack>
                )
                : (
                  <VStack gap={3} align="stretch">
                    {incomingRequests.map((request) => (
                      <HStack key={request.id} p={4} bg="bg.subtle" borderRadius="md" justify="space-between">
                        <VStack align="start" gap={1}>
                          <Text fontWeight="medium">{request.fromDisplayName}</Text>
                          <Text fontSize="sm" color="fg.muted" fontFamily="mono">
                            {request.fromFriendCode}
                          </Text>
                        </VStack>
                        <HStack>
                          <Button
                            size="sm"
                            colorPalette="green"
                            onClick={() =>
                              handleAcceptRequest(request.id)}
                          >
                            <LuUserCheck />
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRejectRequest(request.id)}
                          >
                            Отклонить
                          </Button>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
            </Box>
          </Tabs.Content>

          {/* Вкладка: Исходящие запросы */}
          <Tabs.Content value="outgoing">
            <Box py={6} maxW="800px">
              <Heading size="md" mb={4}>
                <HStack>
                  <LuSend />
                  <Text>Исходящие запросы</Text>
                </HStack>
              </Heading>

              {isLoading
                ? (
                  <VStack py={8}>
                    <Spinner />
                    <Text color="fg.muted">Загрузка...</Text>
                  </VStack>
                )
                : outgoingRequests.length === 0
                ? (
                  <VStack py={8} color="fg.muted">
                    <LuSend size={48} />
                    <Text>Нет исходящих запросов</Text>
                  </VStack>
                )
                : (
                  <VStack gap={3} align="stretch">
                    {outgoingRequests.map((request) => (
                      <HStack key={request.id} p={4} bg="bg.subtle" borderRadius="md" justify="space-between">
                        <VStack align="start" gap={1}>
                          <Text fontWeight="medium">Запрос отправлен</Text>
                          <Text fontSize="sm" color="fg.muted" fontFamily="mono">
                            {request.toPeerId}
                          </Text>
                        </VStack>
                        <Badge colorPalette="yellow">Ожидает ответа</Badge>
                      </HStack>
                    ))}
                  </VStack>
                )}
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  )
}
