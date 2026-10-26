import { EntrySkip } from '@/app/_components/hero/entry-skip'
import { GameMenu } from '@/app/_components/hero/game-menu'
import { Link } from '@/i18n/navigation'
import { getPublicNavigation } from '@/lib/public-navigation'
import { Box, Container, Heading, HStack, Link as ChakraLink, Stack, Text, VisuallyHidden } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'
import packageJson from '../../../../package.json'

/** Имя, из которого церемония собирает буквы; для скринридера остаётся цельный текст. */
const NAME = 'Kami'

/** Меню приходит в HTML и доступно до загрузки анимации. */
export async function Hero() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  const nav = await getTranslations('nav')
  const boot = await getTranslations('home.boot')
  const items = getPublicNavigation(locale)
  // Строки boot-лога для церемонии входа (KM-030): ключи совпадают с BOOT_LINES в entry-ceremony.ts.
  const logConfig = {
    lines: [
      { key: 'os', label: boot('os', { version: packageJson.version }), ok: '', later: '' },
      { key: 'glyphs', label: boot('glyphs'), ok: boot('ok'), later: boot('later') },
      { key: 'fonts', label: boot('fonts'), ok: boot('ok'), later: boot('later') },
      { key: 'language', label: boot('language'), ok: boot('languageValue'), later: boot('languageValue') },
      { key: 'theme', label: boot('theme'), ok: '', later: '' },
    ],
    themes: { dark: boot('themeDark'), light: boot('themeLight') },
  }

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
            <Box position="relative">
              {/* Слой boot-лога: декоративный, над местом, где позже проявится меню (пока оно скрыто); раскладку не двигает. */}
              <Box
                aria-hidden="true"
                data-entry-log=""
                data-entry-log-config={JSON.stringify(logConfig)}
                position="absolute"
                left={0}
                top="100%"
                mt={8}
                opacity={0}
                pointerEvents="none"
                fontFamily="mono"
                fontSize={{ base: 'xs', md: 'sm' }}
                lineHeight="1.7"
                color="fg.muted"
                whiteSpace="pre"
              />
              <Heading
                asChild
                fontFamily="mono"
                fontWeight="medium"
                fontSize={{ base: '5xl', md: '7xl' }}
                lineHeight={1.1}
              >
                <h1 id="home-title">
                  <VisuallyHidden>{NAME}</VisuallyHidden>
                  <span aria-hidden="true">
                    {Array.from(NAME).map((letter, index) => (
                      <span
                        key={index}
                        data-entry-letter=""
                        data-entry-index={index}
                        style={{ display: 'inline-block' }}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                </h1>
              </Heading>
              <Text mt={3} fontSize="sm" color="fg.muted">
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span data-entry-role="" style={{ display: 'inline-block' }}>{t('role')}</span>
                  <span
                    aria-hidden="true"
                    data-entry-cursor=""
                    style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
                  >
                    <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'currentColor' }} />
                  </span>
                </span>
              </Text>
            </Box>
            <GameMenu
              ariaLabel={t('menuAria')}
              items={items.map((item) => ({
                key: item.key,
                href: item.href,
                label: nav(item.key),
                hint: t(`hints.${item.key}`),
              }))}
            />
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
