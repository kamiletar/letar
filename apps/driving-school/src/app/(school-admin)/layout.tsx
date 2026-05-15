import { Box, Container, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { getSession } from '@/lib/auth'

import { SchoolAdminHeader } from './_components/school-admin-header'

export default async function SchoolAdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/school/stats')
  }

  return (
    <Box minH="100vh" bg="bg.subtle">
      {/* Хедер с информацией о школе и навигацией */}
      <Suspense fallback={null}>
        <SchoolAdminHeader />
      </Suspense>

      {/* Контент */}
      <Container maxW="container.xl" py={6}>
        <VStack gap={6} align="stretch">
          {children}
        </VStack>
      </Container>
    </Box>
  )
}
