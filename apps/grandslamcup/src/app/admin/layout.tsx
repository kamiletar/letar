import { getDbUser, getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/roles'
import { Box, Flex } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AdminHeader } from './_components/admin-header'
import { AdminSidebar } from './_components/admin-sidebar'

export const metadata = {
  title: 'Админ-панель — Grand Slam Cup',
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }

  const user = await getDbUser(session)
  if (!isAdmin(user.roles)) {
    redirect('/')
  }

  return (
    <Box minH="100vh" bg="bg.subtle">
      <AdminHeader userName={session.user.name} />
      <Flex>
        <AdminSidebar />
        <Box flex={1} minW="0" p={{ base: 3, md: 6 }} minH="calc(100vh - 48px)" overflow="auto">
          {children}
        </Box>
      </Flex>
    </Box>
  )
}
