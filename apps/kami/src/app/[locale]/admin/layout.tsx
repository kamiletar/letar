import { getSession } from '@/lib/auth'
import { Box, Container, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { AdminMobileNav, AdminSidebar } from './_components/admin-sidebar'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Layout админ-панели
 * Требует авторизации
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params
  const session = await getSession()

  // Редирект на логин если не авторизован
  if (!session?.user) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/admin`)
  }

  // Проверяем роль ADMIN
  if (!session.user.roles?.includes('ADMIN')) {
    redirect(`/${locale}/403`)
  }

  return (
    <Flex minH="calc(100vh - 120px)">
      {/* Сайдбар — desktop */}
      <AdminSidebar locale={locale} />

      {/* Мобильное меню — hamburger + Drawer */}
      <AdminMobileNav locale={locale} />

      {/* Основной контент */}
      <Box flex="1" p={{ base: 4, md: 6 }} pt={{ base: 14, lg: 6 }} bg="bg.subtle">
        <Container maxW="6xl">{children}</Container>
      </Box>
    </Flex>
  )
}
