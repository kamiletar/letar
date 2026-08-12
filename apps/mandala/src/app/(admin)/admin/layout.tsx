import { getSession } from '@/lib/auth'
import { Box, Flex, HStack } from '@chakra-ui/react'
import { AdminBreadcrumbs } from '@letar/admin-ui'
import { redirect } from 'next/navigation'
import type { JSX, ReactNode } from 'react'
import { logoutAction } from './_actions/logout.action'
import { AdminSidebarClient, MobileAdminDrawerClient } from './_components/admin-nav-client'

/** Маппинг сегментов пути на человекочитаемые названия */
const PATH_NAMES: Record<string, string> = {
  admin: 'Админ',
  mandalas: 'Мандалы',
  products: 'Товары',
  orders: 'Заказы',
  'content-pages': 'Страницы',
  contacts: 'Сообщения',
  settings: 'Настройки',
  new: 'Создание',
  edit: 'Редактирование',
}

export default async function AdminLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await getSession()

  // Защита — только админы
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/sign-in?callbackUrl=/admin')
  }

  return (
    <Flex minH="100vh">
      {/* Sidebar (только на md+) */}
      <AdminSidebarClient userEmail={session?.user?.email} onLogout={logoutAction} />

      {/* Main content */}
      <Box flex={1} p={{ base: 4, md: 6 }} overflow="auto">
        {/* Гамбургер-меню только на мобильном, breadcrumbs — единственный рендер для обоих размеров */}
        <HStack mb={4} justify="space-between">
          <Box display={{ base: 'flex', md: 'none' }}>
            <MobileAdminDrawerClient userEmail={session?.user?.email} onLogout={logoutAction} />
          </Box>
          <AdminBreadcrumbs pathNames={PATH_NAMES} />
        </HStack>

        {children}
      </Box>
    </Flex>
  )
}
