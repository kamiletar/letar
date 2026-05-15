import { requirePoet } from '@/lib/roles'
import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { PoetHeader } from './_components/poet-header'
import { PoetSidebar } from './_components/poet-sidebar'

export const metadata = {
  title: 'Кабинет поэта — Grand Slam Cup',
}

export default async function PoetLayout({ children }: { children: ReactNode }) {
  const poet = await requirePoet()

  /** Ссылка на публичный профиль */
  const publicProfileHref = poet.citySlug
    ? `/${poet.citySlug}/players/${poet.playerSlug}`
    : `/players/${poet.playerSlug}`

  return (
    <Box minH="100vh" bg="bg.subtle">
      <PoetHeader playerName={poet.playerName} publicProfileHref={publicProfileHref} />
      <Flex>
        <PoetSidebar />
        <Box flex={1} p={{ base: 3, md: 6 }} minH="calc(100vh - 48px)" overflow="auto">
          {children}
        </Box>
      </Flex>
    </Box>
  )
}
