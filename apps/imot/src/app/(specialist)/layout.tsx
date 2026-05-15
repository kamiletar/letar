import { AppHeader } from '@/app/_components/navigation/app-header'
import { AppSidebar } from '@/app/_components/navigation/app-sidebar'
import { QuickActionsMenu } from '@/app/_components/navigation/quick-actions-menu'
import { getSession } from '@/lib/auth'
import { Box, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

interface SpecialistLayoutProps {
  children: ReactNode
}

/**
 * Layout для страниц SPECIALIST (Специалист)
 * Проверяет, что пользователь имеет роль SPECIALIST или ADMIN
 * Редиректит в /dashboard если роль не соответствует
 */
export default async function SpecialistLayout({ children }: SpecialistLayoutProps) {
  const session = await getSession()

  // Если пользователь не авторизован, редирект на страницу входа
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Если пользователь не специалист и не админ, редирект на dashboard
  if (!['SPECIALIST', 'ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <>
      {/* Header с breadcrumbs и Quick Actions */}
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        showBreadcrumbs={true}
        quickActions={<QuickActionsMenu />}
      />

      {/* Основной контент с Sidebar */}
      <Flex minH="calc(100vh - 64px)">
        {/* Sidebar для специалиста */}
        <AppSidebar role="SPECIALIST" />

        {/* Основной контент */}
        <Box as="main" flex={1} p={{ base: 4, md: 6 }} bg="gray.50" _dark={{ bg: 'gray.900' }} overflow="auto">
          {children}
        </Box>
      </Flex>
    </>
  )
}
