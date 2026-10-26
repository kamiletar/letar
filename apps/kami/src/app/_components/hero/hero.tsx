import { EntrySkip } from '@/app/_components/hero/entry-skip'
import { Link } from '@/i18n/navigation'
import { getPublicNavigation } from '@/lib/public-navigation'
import { Box, Container, Heading, HStack, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'

/** Меню приходит в HTML и доступно до загрузки анимации. */
export async function Hero() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  const nav = await getTranslations('nav')
  const items = getPublicNavigation(locale)

  return (
    <Box position="relative" isolation="isolate" color={{ base: 'gray.900', _dark: 'gray.100' }}>
      <Container maxW="6xl" px={{ base: 6, md: 12 }}>
        <Stack
          asChild
          minH="calc(100svh - var(--kami-header-h, 80px))"
          justify="center"
          align="start"
          gap={{ base: 8, md: 10 }}
          py={10}
          w="full"
        >
          <section aria-labelledby="home-title" data-testid="home-menu">
            <Box>
              <Heading
                asChild
                fontFamily="mono"
                fontWeight="medium"
                fontSize={{ base: '5xl', md: '7xl' }}
                lineHeight={1.1}
              >
                <h1 id="home-title">Kami</h1>
              </Heading>
              <Text mt={3} fontSize="sm" color="fg.muted">{t('role')}</Text>
            </Box>
            <Stack asChild gap={2} align="stretch" w="full" maxW="md">
              <nav aria-label={t('menuAria')}>
                {items.map((item) => (
                  <ChakraLink
                    key={item.key}
                    asChild
                    px={4}
                    py={2}
                    minH="48px"
                    fontSize={{ base: 'xl', md: '2xl' }}
                    fontWeight="medium"
                    color="inherit"
                    textDecoration="none"
                    borderRadius="md"
                    bg={{ base: 'white/45', _dark: 'bg/45' }}
                    backdropFilter="blur(12px) saturate(140%)"
                    borderWidth="1px"
                    borderColor={{ base: 'fg.700/20', _dark: 'fg.200/20' }}
                    shadow="sm"
                    _hover={{ bg: { base: 'white/65', _dark: 'bg/65' }, borderColor: 'fg.muted' }}
                    _focusVisible={{ outline: '2px solid', outlineColor: 'fg.muted', outlineOffset: '3px' }}
                  >
                    {item.key === 'order'
                      ? <a href={item.href}>{nav(item.key)}</a>
                      : <Link href={item.href}>{nav(item.key)}</Link>}
                  </ChakraLink>
                ))}
              </nav>
            </Stack>
          </section>
        </Stack>
        <EntrySkip label={t('skipEntry')} />

        <Stack
          asChild
          id="friends"
          gap={4}
          py={{ base: 12, md: 20 }}
          maxW="2xl"
          scrollMarginTop="calc(var(--kami-header-h, 80px) + 24px)"
        >
          <section aria-labelledby="friends-title">
            <Heading asChild size="2xl">
              <h2 id="friends-title">{nav('friends')}</h2>
            </Heading>
            <Text fontSize="lg" lineHeight="tall" bg="bg" p={4} borderRadius="md">{t('friendsStatus')}</Text>
            <HStack>
              <ChakraLink asChild minH="44px" fontWeight="medium" color="fg.muted">
                <Link href="/contacts/">{t('write')}</Link>
              </ChakraLink>
            </HStack>
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
