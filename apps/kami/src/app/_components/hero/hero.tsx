import { Link } from '@/i18n/navigation'
import { getPublicNavigation } from '@/lib/public-navigation'
import { CONTACT } from '@/lib/utils/constants'
import { Box, Container, Heading, HStack, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { CopyToClipboardButton } from '@letar/ui/copy-to-clipboard-button'
import { getLocale, getTranslations } from 'next-intl/server'

/** Меню и контакты приходят в HTML и доступны до загрузки анимации. */
export async function Hero() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  const nav = await getTranslations('nav')
  const items = getPublicNavigation(locale)
  const contacts = [
    { label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { label: 'Telegram', value: CONTACT.telegram, href: `https://t.me/${CONTACT.telegram.slice(1)}` },
  ]

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
            <Stack asChild gap={1} align="stretch" w="full" maxW="md">
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
                    borderRadius="sm"
                    bg={{ base: 'white/90', _dark: 'bg/90' }}
                    _hover={{ bg: 'bg.muted', color: 'fg.muted' }}
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

        <Stack
          asChild
          id="contacts"
          gap={6}
          py={{ base: 12, md: 20 }}
          scrollMarginTop="calc(var(--kami-header-h, 80px) + 24px)"
        >
          <section aria-labelledby="contacts-title">
            <Heading asChild size="2xl">
              <h2 id="contacts-title">{nav('contacts')}</h2>
            </Heading>
            <Stack gap={4} maxW="2xl">
              {contacts.map((contact) => (
                <Stack
                  key={contact.label}
                  direction={{ base: 'column', sm: 'row' }}
                  align={{ base: 'start', sm: 'center' }}
                  justify="space-between"
                  gap={2}
                  p={4}
                  bg="bg"
                  borderRadius="md"
                >
                  <Box minW={0}>
                    <Text fontSize="sm" color="fg.muted">{contact.label}</Text>
                    <ChakraLink
                      href={contact.href}
                      minH="44px"
                      fontSize={{ base: 'lg', md: 'xl' }}
                      color="inherit"
                      overflowWrap="anywhere"
                    >
                      {contact.value}
                    </ChakraLink>
                  </Box>
                  <CopyToClipboardButton
                    text={contact.value}
                    label={t('copy', { contact: contact.label })}
                    copiedLabel={t('copied')}
                    minH="44px"
                    flexShrink={0}
                  />
                </Stack>
              ))}
            </Stack>
          </section>
        </Stack>

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
                <Link href="/#contacts">{t('write')}</Link>
              </ChakraLink>
            </HStack>
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
