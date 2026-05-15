import { AppHeader } from '@/app/_components/navigation/app-header'
import { AppSidebar } from '@/app/_components/navigation/app-sidebar'
import { getSession } from '@/lib/auth'
import { Box, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

interface AdminLayoutProps {
  children: ReactNode
}

/**
 * Layout для страниц ADMIN (Администратор)
 * Проверяет, что пользователь имеет роль ADMIN
 * Редиректит в /dashboard если роль не соответствует
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession()

  // Если пользователь не авторизован, редирект на страницу входа
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Если пользователь не админ, редирект на dashboard
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <>
      {/* Header с breadcrumbs и Search (будет реализовано позже) */}
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        showBreadcrumbs={true}
        // Поиск можно добавить позже в quickActions
      />

      {/* Основной контент с Sidebar */}
      <Flex minH="calc(100vh - 64px)">
        {/* Sidebar для админа */}
        <AppSidebar role="ADMIN" />

        {/* Основной контент */}
        <Box as="main" flex={1} p={{ base: 4, md: 6 }} bg="gray.50" _dark={{ bg: 'gray.900' }} overflow="auto">
          {children}
        </Box>
      </Flex>
    </>
  )
}
