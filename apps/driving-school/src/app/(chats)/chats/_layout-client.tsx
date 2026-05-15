'use client'

import { Box, Grid, GridItem, Heading, HStack, IconButton, Spinner } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuPlus } from 'react-icons/lu'

import type { UserRole } from '@letar/driving-school-db/prisma'
import { ChatList } from './_components'
import { SplitPanelContainer } from './_components/split-panel'
import { ActiveChatProvider } from './_context/active-chat-context'
import { useSocket } from './_hooks/use-socket'
import type { ChatSummary } from './_services'

// Динамический импорт диалога для code splitting
const NewChatDialog = dynamic(() => import('./_components/new-chat-dialog').then((m) => m.NewChatDialog), {
  ssr: false,
  loading: () => <Spinner size="sm" />,
})

interface ChatsLayoutClientProps {
  chats: ChatSummary[]
  userRoles: UserRole[]
  hasStudentProfile: boolean
  hasInstructorProfile: boolean
  isManagerOfAnySchool: boolean
  currentUserId: string
  children: React.ReactNode
}

export function ChatsLayoutClient({
  chats,
  userRoles,
  hasStudentProfile,
  hasInstructorProfile,
  isManagerOfAnySchool,
  currentUserId,
  children,
}: ChatsLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const { socket, isConnected } = useSocket()

  // Подписка на обновление списка чатов
  useEffect(() => {
    if (!socket) {
      return
    }

    const handleChatListUpdate = () => {
      // Обновляем данные с сервера
      router.refresh()
    }

    socket.on('chat_list_update', handleChatListUpdate)

    return () => {
      socket.off('chat_list_update', handleChatListUpdate)
    }
  }, [socket, router])

  // Определяем активный чат из пути
  const activeChatId = pathname.startsWith('/chats/') ? pathname.split('/')[2] : undefined

  // На мобильных: показываем либо список, либо чат
  const showList = !activeChatId

  return (
    <ActiveChatProvider>
      <Box h="100dvh">
        {/* Grid: 2 колонки на md, 3 колонки на lg+ */}
        <Grid
          templateColumns={{
            base: '1fr',
            md: '280px 1fr',
            lg: '280px 1fr 320px',
          }}
          h="full"
        >
          {/* Список чатов */}
          <GridItem
            borderRightWidth={{ base: 0, md: 1 }}
            display={{ base: showList ? 'block' : 'none', md: 'block' }}
            h="full"
            overflow="hidden"
          >
            <Box h="full" display="flex" flexDirection="column">
              {/* Заголовок */}
              <HStack p={4} borderBottomWidth={1} justify="space-between">
                <HStack gap={2}>
                  <IconButton asChild aria-label="Назад" variant="ghost" size="sm">
                    <Link href="/dashboard">
                      <LuArrowLeft />
                    </Link>
                  </IconButton>
                  <Heading size="md">Чаты</Heading>
                  <Box
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg={isConnected ? 'green.500' : 'gray.400'}
                    title={isConnected ? 'Онлайн' : 'Офлайн'}
                  />
                </HStack>
                {/* Кнопка "Новый чат" — только для инструкторов, менеджеров, OWNER */}
                {(hasInstructorProfile || isManagerOfAnySchool || userRoles.includes('OWNER')) && (
                  <IconButton
                    aria-label="Новый чат"
                    colorPalette="brand"
                    size="sm"
                    onClick={() => setIsNewChatOpen(true)}
                  >
                    <LuPlus />
                  </IconButton>
                )}
              </HStack>

              {/* Список */}
              <Box flex={1} overflow="hidden">
                <ChatList chats={chats} activeChatId={activeChatId} />
              </Box>
            </Box>
          </GridItem>

          {/* Содержимое чата */}
          <GridItem display={{ base: showList ? 'none' : 'block', md: 'block' }} h="full" overflow="hidden">
            {children}
          </GridItem>

          {/* Сплитскрин-панель (только на lg+) */}
          <GridItem display={{ base: 'none', lg: 'block' }} h="full" overflow="hidden">
            <SplitPanelContainer
              userRoles={userRoles}
              currentUserId={currentUserId}
              hasInstructorProfile={hasInstructorProfile}
            />
          </GridItem>
        </Grid>

        {/* Диалог нового чата */}
        <NewChatDialog
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          userRoles={userRoles}
          hasStudentProfile={hasStudentProfile}
          hasInstructorProfile={hasInstructorProfile}
          isManagerOfAnySchool={isManagerOfAnySchool}
        />
      </Box>
    </ActiveChatProvider>
  )
}
