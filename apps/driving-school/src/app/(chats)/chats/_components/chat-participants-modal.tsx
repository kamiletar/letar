'use client'

import { isFreelanceInstructor, isModerator, isOwner } from '@/lib/roles'
import { Avatar, Box, Dialog, HStack, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import type { UserRole } from '@letar/driving-school-db/prisma'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getOrCreatePrivateChatAction } from '../_actions/chat.action'
import { usePresence } from '../_hooks/use-presence'
import { useSocket } from '../_hooks/use-socket'

interface Participant {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
    roles: UserRole[]
  }
  isAdmin: boolean
}

interface ChatParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  currentUserId: string
}

function getRoleName(roles: UserRole[]): string {
  if (isOwner(roles)) {
    return 'Владелец платформы'
  }
  if (isModerator(roles)) {
    return 'Модератор'
  }
  if (isFreelanceInstructor(roles)) {
    return 'Инструктор'
  }
  return 'Пользователь'
}

export function ChatParticipantsModal({ isOpen, onClose, participants, currentUserId }: ChatParticipantsModalProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { socket } = useSocket()

  // Получаем статусы всех участников
  const participantIds = participants.map((p) => p.userId)
  const { isUserOnline } = usePresence({
    socket,
    initialUserIds: isOpen ? participantIds : [],
  })

  const handleParticipantClick = async (participantId: string) => {
    if (participantId === currentUserId) {
      return
    }

    setLoadingId(participantId)
    try {
      const result = await getOrCreatePrivateChatAction(participantId)
      if (result.success) {
        onClose()
        router.push(`/chats/${result.chatId}`)
      }
    } catch (error) {
      console.error('Failed to open chat', error)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size={{ base: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH={{ base: '100vh', md: '80vh' }}>
            <Dialog.Header>
              <Dialog.Title>Участники чата ({participants.length})</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <VStack gap={2} align="stretch" py={2}>
                {participants.map((p) => {
                  const isMe = p.userId === currentUserId
                  return (
                    <HStack
                      key={p.id}
                      gap={3}
                      p={2}
                      borderRadius="md"
                      cursor={isMe ? 'default' : 'pointer'}
                      _hover={{ bg: 'bg.subtle' }}
                      onClick={() => !loadingId && handleParticipantClick(p.userId)}
                      opacity={loadingId && loadingId !== p.userId ? 0.5 : 1}
                    >
                      <Avatar.Root size="sm">
                        <Avatar.Fallback>{p.user.name?.charAt(0).toUpperCase() || '?'}</Avatar.Fallback>
                        {p.user.image && <Avatar.Image src={p.user.image} alt={p.user.name || 'User'} />}
                        {isUserOnline(p.userId) && (
                          <Box
                            position="absolute"
                            bottom="-2px"
                            right="-2px"
                            w={3}
                            h={3}
                            bg="success.solid"
                            borderRadius="full"
                            borderWidth={2}
                            borderColor="bg.panel"
                          />
                        )}
                      </Avatar.Root>
                      <Box flex={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          {p.user.name || 'Без имени'} {isMe && '(Вы)'}
                        </Text>
                        <Text color="fg.muted" fontSize="xs">
                          {getRoleName(p.user.roles)}
                          {p.isAdmin && ' • Админ чата'}
                        </Text>
                      </Box>
                      {loadingId === p.userId && <Spinner size="sm" />}
                    </HStack>
                  )
                })}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
