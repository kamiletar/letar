import { Breadcrumbs } from '@/app/_components/breadcrumbs'
import { getSession } from '@/lib/auth'
import { isOwner } from '@/lib/roles'
import { Box, Container, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { OwnerHeader, OwnerNav } from './_components/owner-nav'

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/owner')
  }

  if (!isOwner(session.user.roles)) {
    redirect('/dashboard')
  }

  return (
    <Box minH="100vh" bg="bg.subtle">
      {/* Хедер */}
      <OwnerHeader />

      {/* Навигация */}
      <OwnerNav />

      {/* Контент */}
      <Box as="main" role="main">
        <Container maxW="container.xl" py={6}>
          <VStack gap={6} align="stretch">
            {/* Breadcrumbs */}
            <Breadcrumbs homePath="/owner" homeLabel="Обзор" />

            {children}
          </VStack>
        </Container>
      </Box>
    </Box>
  )
}
