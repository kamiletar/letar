/**
 * Layout для личного кабинета (счетовод, ведущий, профиль).
 * Использует тот же хедер и футер что и публичные страницы.
 */

import { getCities } from '@/lib/city'
import { Box, Container, Flex } from '@chakra-ui/react'

import { PublicHeader } from '../_components/header'
import { PublicFooter } from '../_components/public-footer'

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const cities = await getCities()
  const cityTelegramMap = Object.fromEntries(cities.filter((c) => c.telegramLink).map((c) => [c.slug, c.telegramLink!]))

  return (
    <Flex direction="column" minH="100dvh" overflowX="hidden">
      <PublicHeader />
      <Box flex="1" minW={0} asChild>
        <main>
          <Container maxW="container.xl" py={6} overflowX="hidden">
            {children}
          </Container>
        </main>
      </Box>
      <PublicFooter cityTelegramMap={cityTelegramMap} />
    </Flex>
  )
}
