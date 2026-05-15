import { requireCoach } from '@/lib/roles'
import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { CoachHeader } from './_components/coach-header'
import { CoachSidebar } from './_components/coach-sidebar'

export const metadata = {
  title: 'Кабинет тренера — Grand Slam Cup',
}

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const coach = await requireCoach()

  return (
    <Box minH="100vh" bg="bg.subtle">
      <CoachHeader teamName={coach.teamName} />
      <Flex>
        <CoachSidebar />
        <Box flex={1} p={{ base: 3, md: 6 }} minH="calc(100vh - 48px)" overflow="auto">
          {children}
        </Box>
      </Flex>
    </Box>
  )
}
