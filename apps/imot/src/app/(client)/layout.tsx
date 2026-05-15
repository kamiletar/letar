import { AppHeader } from '@/app/_components/navigation/app-header'
import { AppSidebar } from '@/app/_components/navigation/app-sidebar'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Box, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

interface ClientLayoutProps {
  children: ReactNode
}

/**
 * Layout для страниц CLIENT (Клиент)
 * Проверяет, что пользователь имеет роль CLIENT
 * Редиректит в /dashboard если роль не соответствует
 *
 * ВАЖНО: Проверка профиля НЕ выполняется для /draft-request
 * (это делается в самой странице draft-request/page.tsx)
 */
export default async function ClientLayout({ children }: ClientLayoutProps) {
  const session = await getSession()

  // Если пользователь не авторизован, редирект на страницу входа
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Если пользователь не клиент, редирект на dashboard (там определится правильный маршрут)
  if (session.user.role !== 'CLIENT') {
    redirect('/dashboard')
  }

  // Проверяем наличие профиля для определения, показывать ли sidebar
  const clientProfile = await prisma.client.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      mainRequest: true,
    },
  })

  // Если профиля нет или запрос не заполнен - это страница /draft-request
  // Скрываем sidebar для упрощённого интерфейса
  const showSidebar = clientProfile && clientProfile.mainRequest

  return (
    <>
      {/* Header с breadcrumbs */}
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        showBreadcrumbs={Boolean(showSidebar)}
      />

      {/* Основной контент с/без Sidebar */}
      <Flex minH="calc(100vh - 64px)">
        {/* Sidebar - показываем только если профиль заполнен */}
        {showSidebar && <AppSidebar role="CLIENT" />}

        {/* Основной контент */}
        <Box as="main" flex={1} p={{ base: 4, md: 6 }} bg="gray.50" _dark={{ bg: 'gray.900' }} overflow="auto">
          {children}
        </Box>
      </Flex>
    </>
  )
}
