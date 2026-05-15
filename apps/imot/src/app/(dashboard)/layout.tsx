import { AppHeader } from '@/app/_components/navigation/app-header'
import { AppSidebar } from '@/app/_components/navigation/app-sidebar'
import { getSession } from '@/lib/auth'
import { Box, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout для страницы Dashboard (общий для всех ролей)
 * Содержит Header + Sidebar + основной контент
 * Проверяет авторизацию и редиректит неавторизованных пользователей
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession()

  // Если пользователь не авторизован, редирект на страницу входа
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <>
      {/* Header с навигацией */}
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
      />

      {/* Основной контент с Sidebar */}
      <Flex minH="calc(100vh - 64px)">
        {/* Sidebar (скрыт на мобильных) */}
        <AppSidebar role={session.user.role} />

        {/* Основной контент */}
        <Box as="main" flex={1} p={{ base: 4, md: 6 }} bg="gray.50" _dark={{ bg: 'gray.900' }} overflow="auto">
          {children}
        </Box>
      </Flex>
    </>
  )
}
