'use client'

import { Avatar, Box, Dialog, HStack, Input, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuGlobe, LuGraduationCap, LuMessageCircle, LuMessageSquare, LuUsers } from 'react-icons/lu'

import { isFreelanceInstructor } from '@/lib/roles'
import type { UserRole } from '@letar/driving-school-db/prisma'
import {
  getContactsAction,
  getOrCreateInstructorStudentsChatAction,
  getOrCreatePrivateChatAction,
  getOrCreateSystemChatAction,
} from '../_actions/chat.action'
import { getOrCreatePlatformFeedbackChatAction } from '../_actions/platform-chats.action'
import { usePresence } from '../_hooks/use-presence'
import { useSocket } from '../_hooks/use-socket'
import type { Contact } from '../_services'

interface NewChatDialogProps {
  isOpen: boolean
  onClose: () => void
  userRoles: UserRole[]
  hasStudentProfile: boolean
  hasInstructorProfile: boolean
  /** Пользователь является менеджером хотя бы одной школы */
  isManagerOfAnySchool?: boolean
}

export function NewChatDialog({
  isOpen,
  onClose,
  userRoles,
  hasStudentProfile,
  hasInstructorProfile,
  isManagerOfAnySchool = false,
}: NewChatDialogProps) {
  const isOwner = userRoles.includes('OWNER')
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { socket } = useSocket()

  // Получаем статусы контактов
  const contactIds = contacts.map((c) => c.id)
  const { isUserOnline } = usePresence({
    socket,
    initialUserIds: isOpen ? contactIds : [],
  })

  // Загрузка контактов
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getContactsAction().then((result) => {
        if (result.success) {
          setContacts(result.contacts)
        }
        setLoading(false)
      })
    }
  }, [isOpen])

  // Фильтрация контактов
  const filteredContacts = contacts.filter((contact) => contact.name?.toLowerCase().includes(search.toLowerCase()))

  // Создание приватного чата
  const handleCreatePrivateChat = async (participantId: string) => {
    setCreating(true)
    const result = await getOrCreatePrivateChatAction(participantId)
    if (result.success) {
      router.push(`/chats/${result.chatId}`)
      onClose()
    }
    setCreating(false)
  }

  // Открытие системного чата
  const handleOpenSystemChat = async (type: 'INSTRUCTORS' | 'STUDENTS' | 'GENERAL') => {
    setCreating(true)
    const result = await getOrCreateSystemChatAction(type)
    if (result.success) {
      router.push(`/chats/${result.chatId}`)
      onClose()
    }
    setCreating(false)
  }

  // Открытие чата инструктора с учениками (для фрилансеров)
  const handleOpenInstructorStudentsChat = async () => {
    setCreating(true)
    const result = await getOrCreateInstructorStudentsChatAction()
    if (result.success) {
      router.push(`/chats/${result.chatId}`)
      onClose()
    }
    setCreating(false)
  }

  // Открытие канала обратной связи с платформой
  const handleOpenPlatformFeedbackChat = async () => {
    setCreating(true)
    const result = await getOrCreatePlatformFeedbackChatAction()
    if (result.success) {
      router.push(`/chats/${result.chatId}`)
      onClose()
    }
    setCreating(false)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size={{ base: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH={{ base: '100vh', md: '80vh' }}>
            <Dialog.Header>
              <Dialog.Title>Новый чат</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Платформенные чаты (только для менеджеров школ и OWNER) */}
                {(isOwner || isManagerOfAnySchool) && (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
                      Платформа
                    </Text>
                    <VStack gap={1} align="stretch">
                      <GroupChatItem
                        icon={LuMessageCircle}
                        name="Обратная связь"
                        description="Общий канал фидбека с разработчиком"
                        onClick={handleOpenPlatformFeedbackChat}
                        disabled={creating}
                      />
                    </VStack>
                  </Box>
                )}

                {/* Групповые чаты */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
                    Групповые чаты
                  </Text>
                  <VStack gap={1} align="stretch">
                    {/* Чат инструкторов (только для инструкторов) */}
                    {hasInstructorProfile && (
                      <GroupChatItem
                        icon={LuUsers}
                        name="Чат инструкторов"
                        description="Общение с коллегами"
                        onClick={() => handleOpenSystemChat('INSTRUCTORS')}
                        disabled={creating}
                      />
                    )}

                    {/* Чат с учениками (только для фрилансеров) */}
                    {isFreelanceInstructor(userRoles) && (
                      <GroupChatItem
                        icon={LuGraduationCap}
                        name="Чат с учениками"
                        description="Общение со всеми вашими учениками"
                        onClick={handleOpenInstructorStudentsChat}
                        disabled={creating}
                      />
                    )}

                    {/* Чат учеников (только для учеников) */}
                    {hasStudentProfile && (
                      <GroupChatItem
                        icon={LuUsers}
                        name="Чат учеников"
                        description="Общение с другими учениками"
                        onClick={() => handleOpenSystemChat('STUDENTS')}
                        disabled={creating}
                      />
                    )}

                    {/* Общий чат */}
                    <GroupChatItem
                      icon={LuGlobe}
                      name="Общий чат"
                      description="Все пользователи платформы"
                      onClick={() => handleOpenSystemChat('GENERAL')}
                      disabled={creating}
                    />
                  </VStack>
                </Box>

                {/* Личные чаты */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
                    Личные чаты
                  </Text>

                  {/* Поиск контактов */}
                  <Input
                    placeholder="Поиск контактов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    mb={2}
                  />

                  {/* Список контактов */}
                  <VStack gap={1} align="stretch" maxH="300px" overflowY="auto">
                    {loading ? (
                      <Box py={4} textAlign="center">
                        <Spinner size="sm" />
                      </Box>
                    ) : filteredContacts.length === 0 ? (
                      <Box py={4} textAlign="center">
                        <Text color="fg.muted">{search ? 'Контакты не найдены' : 'Нет доступных контактов'}</Text>
                        <Text fontSize="sm" color="fg.muted" mt={1}>
                          {hasStudentProfile ? 'Здесь появятся ваши инструкторы' : 'Здесь появятся ваши ученики'}
                        </Text>
                      </Box>
                    ) : (
                      filteredContacts.map((contact) => (
                        <ContactItem
                          key={contact.id}
                          contact={contact}
                          onClick={() => handleCreatePrivateChat(contact.id)}
                          disabled={creating}
                          isOnline={isUserOnline(contact.id)}
                        />
                      ))
                    )}
                  </VStack>
                </Box>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

interface GroupChatItemProps {
  icon: React.ElementType
  name: string
  description: string
  onClick: () => void
  disabled?: boolean
}

function GroupChatItem({ icon: Icon, name, description, onClick, disabled }: GroupChatItemProps) {
  return (
    <HStack
      gap={3}
      p={3}
      borderRadius="md"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.5 : 1}
      _hover={{ bg: disabled ? undefined : 'bg.subtle' }}
      onClick={disabled ? undefined : onClick}
    >
      <Box
        w={10}
        h={10}
        borderRadius="full"
        bg="bg.emphasized"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Icon size={20} />
      </Box>
      <Box flex={1}>
        <Text fontWeight="medium">{name}</Text>
        <Text fontSize="sm" color="fg.muted">
          {description}
        </Text>
      </Box>
    </HStack>
  )
}

interface ContactItemProps {
  contact: Contact
  onClick: () => void
  disabled?: boolean
  isOnline?: boolean
}

function ContactItem({ contact, onClick, disabled, isOnline }: ContactItemProps) {
  // Показываем главную роль (в порядке приоритета)
  const roleLabel = isFreelanceInstructor(contact.roles) ? 'Инструктор' : 'Пользователь'

  return (
    <HStack
      gap={3}
      p={3}
      borderRadius="md"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.5 : 1}
      _hover={{ bg: disabled ? undefined : 'bg.subtle' }}
      onClick={disabled ? undefined : onClick}
    >
      <Avatar.Root size="md">
        <Avatar.Fallback>{contact.name?.charAt(0).toUpperCase() || '?'}</Avatar.Fallback>
        {contact.image && <Avatar.Image src={contact.image} alt={contact.name || 'User'} />}
        {isOnline && (
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
        <Text fontWeight="medium">{contact.name || 'Без имени'}</Text>
        <Text fontSize="sm" color="fg.muted">
          {roleLabel}
        </Text>
      </Box>
      <LuMessageSquare size={16} />
    </HStack>
  )
}
