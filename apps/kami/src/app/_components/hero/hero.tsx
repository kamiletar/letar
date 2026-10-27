import { EntryHints } from '@/app/_components/hero/entry-hints'
import { EntryLanguage } from '@/app/_components/hero/entry-language'
import { GameMenu } from '@/app/_components/hero/game-menu'
import { HomeCorner } from '@/app/_components/hero/home-corner'
import { HomeFooterLine } from '@/app/_components/hero/home-footer-line'
import { getPublicNavigation } from '@/lib/public-navigation'
import { Box, Heading, Stack, Text, VisuallyHidden } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'
import packageJson from '../../../../package.json'

/** Имя, из которого церемония собирает буквы; для скринридера остаётся цельный текст. */
const NAME = 'Kami'

/** Высота cookie-баннера (публикует сам баннер, 0 — если его нет): центр и нижние строки поднимаются над ним. */
const BANNER = 'var(--letar-cookie-banner-height, 0px)'

/**
 * Главная — один полноэкранный стартовый экран (KM-039): имя, роль и меню по центру, значки в углу вместо
 * шапки, одна строка внизу вместо подвала. Меню приходит в HTML и доступно до загрузки анимации.
 */
export async function Hero() {
  const locale = await getLocale()
  const t = await getTranslations('home')
  const nav = await getTranslations('nav')
  const boot = await getTranslations('home.boot')
  const items = getPublicNavigation(locale)
  // Строки boot-лога для церемонии входа: ключи совпадают с BOOT_LINES в entry-ceremony.ts. Строка `os`
  // остаётся голой подписью; значение темы подставляет DOM-слой по текущей теме.
  const ok = boot('ok')
  const logConfig = {
    lines: [
      { key: 'os', label: boot('os', { version: packageJson.version }), ok: '' },
      { key: 'glyphs', label: boot('glyphs'), ok },
      { key: 'fonts', label: boot('fonts'), ok },
      { key: 'language', label: boot('language'), ok: boot('languageValue') },
      { key: 'theme', label: boot('theme'), ok },
      { key: 'rain', label: boot('rain'), ok },
      { key: 'menu', label: boot('menu'), ok },
    ],
    themes: { dark: boot('themeDark'), light: boot('themeLight') },
  }

  return (
    <Box position="absolute" inset={0} isolation="isolate" color={{ base: 'gray.900', _dark: 'gray.100' }}>
      <HomeCorner ariaLabel={t('cornerAria')} replayLabel={t('replayEntry')} />

      {/* Содержимое по центру; на очень низком экране прокручивается внутри, а не страница. */}
      <Stack
        position="absolute"
        inset={0}
        overflowY="auto"
        align="center"
        px={{ base: 6, md: 12 }}
        pt={14}
        pb={`calc(5.5rem + ${BANNER})`}
      >
        <Stack asChild gap={{ base: 6, md: 8 }} align="center" my="auto" w="full">
          <section aria-labelledby="home-title" data-testid="home-menu">
            <Box textAlign="center">
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
      </Stack>

      {/* Слой boot-лога: декоративный, по центру экрана, там же, где позже проявится меню; раскладку не двигает. */}
      <Box
        position="absolute"
        inset={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        pointerEvents="none"
        aria-hidden="true"
      >
        <Box
          data-entry-log=""
          data-entry-log-config={JSON.stringify(logConfig)}
          opacity={0}
          fontFamily="mono"
          fontSize={{ base: 'xs', md: 'sm' }}
          lineHeight="1.7"
          color="fg.muted"
          whiteSpace="pre"
          css={{
            '& > div': { minHeight: '1.7em' },
            // Ореол цвета страницы: буквы фона не мешают читать строки лога.
            textShadow:
              '0 0 4px var(--chakra-colors-bg), 0 0 8px var(--chakra-colors-bg), 0 0 12px var(--chakra-colors-bg)',
          }}
        />
      </Box>

      <Stack position="absolute" left={0} right={0} bottom={BANNER} gap={0} align="stretch" px={4}>
        <EntryHints
          labels={{ desktop: t('keys.desktop'), desktopDone: t('keys.desktopDone'), touch: t('keys.touch') }}
        />
        <HomeFooterLine privacyLabel={t('privacyLink')} />
      </Stack>

      <EntryLanguage />
    </Box>
  )
}
