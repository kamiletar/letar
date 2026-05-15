'use client'

import { Box, HStack, IconButton, Popover, Portal, Text, VStack } from '@chakra-ui/react'
import { LuEllipsisVertical, LuPencil, LuReply, LuSmile, LuTrash2 } from 'react-icons/lu'
import type { ChatMessage } from '../_services'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

interface MessageActionsProps {
  message: ChatMessage
  isOwn: boolean
  onReply?: (messageId: string) => void
  onEdit?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
}

export function MessageActions({ message, isOwn, onReply, onEdit, onDelete, onReaction }: MessageActionsProps) {
  return (
    <HStack gap={1} opacity={{ base: 1, md: 0 }} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
      {/* Реакции */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton aria-label="Реакция" size="xs" variant="ghost" color="fg.muted">
            <LuSmile size={16} />
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content w="auto" p={1}>
              <HStack gap={1}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Box
                    key={emoji}
                    as="button"
                    p={1}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => onReaction?.(message.id, emoji)}
                  >
                    {emoji}
                  </Box>
                ))}
              </HStack>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>

      {/* Ответить */}
      <IconButton
        aria-label="Ответить"
        size="xs"
        variant="ghost"
        color="fg.muted"
        onClick={() => onReply?.(message.id)}
      >
        <LuReply size={16} />
      </IconButton>

      {/* Меню для своих сообщений */}
      {isOwn && (
        <Popover.Root>
          <Popover.Trigger asChild>
            <IconButton aria-label="Ещё" size="xs" variant="ghost" color="fg.muted">
              <LuEllipsisVertical size={16} />
            </IconButton>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="auto" p={1}>
                <VStack gap={0} align="stretch">
                  <Box
                    as="button"
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => onEdit?.(message)}
                  >
                    <LuPencil size={14} />
                    <Text fontSize="sm">Редактировать</Text>
                  </Box>
                  <Box
                    as="button"
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    color="error.solid"
                    _hover={{ bg: 'error.subtle' }}
                    onClick={() => onDelete?.(message.id)}
                  >
                    <LuTrash2 size={14} />
                    <Text fontSize="sm">Удалить</Text>
                  </Box>
                </VStack>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </HStack>
  )
}
