'use client'

import { ENTRY_RESUME_KEY } from '@/lib/entry-boot-script'
import { Box, Stack, Text } from '@chakra-ui/react'
import { trackEvent } from '@letar/analytics'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

const LANGUAGES = [
  { code: 'ru', short: 'RU', href: '/' },
  { code: 'en', short: 'EN', href: '/en/' },
] as const
type LanguageCode = (typeof LANGUAGES)[number]['code']

/** Экран выбора языка виден, пока ранний скрипт держит на `<html>` атрибут `data-kami-entry-lang`. */
const isActive = () => document.documentElement.hasAttribute('data-kami-entry-lang')

/**
 * Экран выбора языка перед загрузкой (KM-039): «как в игре», по центру, маркер ▶ у пункта.
 * Серверная разметка уже содержит экран; CSS (`global.css`) показывает его только при атрибуте
 * `data-kami-entry-lang`, поэтому без JS и при reduced-motion его нет. Предвыбор — язык адреса.
 * Выбор текущего языка запускает загрузку (событие `kami:entry-language`); выбор другого — переход
 * на его адрес с одноразовой меткой, по которой там вход продолжается без второго экрана языка.
 */
export function EntryLanguage() {
  const t = useTranslations('home.language')
  const locale = useLocale() as LanguageCode
  const [selected, setSelected] = useState(Math.max(0, LANGUAGES.findIndex((item) => item.code === locale)))
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const confirm = (index: number) => {
    const target = LANGUAGES[index]
    trackEvent('entry-language', { language: target.code })
    if (target.code === locale) {
      window.dispatchEvent(new Event('kami:entry-language'))
      return
    }
    try {
      sessionStorage.setItem(ENTRY_RESUME_KEY, String(Date.now()))
    } catch { /* приватный режим: на новом адресе экран языка покажется ещё раз */ }
    window.location.assign(target.href)
  }

  // Состояние читаем через ref: слушатель клавиатуры ставится один раз и не пересоздаётся на каждый выбор.
  const state = useRef({ selected, confirm })
  useEffect(() => {
    state.current = { selected, confirm }
  })

  useEffect(() => {
    if (isActive()) { buttons.current[state.current.selected]?.focus({ preventScroll: true }) }
    const onKey = (event: KeyboardEvent) => {
      if (!isActive() || event.metaKey || event.ctrlKey || event.altKey) { return }
      const move = (delta: number) => {
        event.preventDefault()
        const next = (state.current.selected + delta + LANGUAGES.length) % LANGUAGES.length
        setSelected(next)
        buttons.current[next]?.focus({ preventScroll: true })
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { move(1) }
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { move(-1) }
      else if (event.key === 'Tab') { move(event.shiftKey ? -1 : 1) }
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        state.current.confirm(state.current.selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-language-title"
      data-entry-language=""
      position="fixed"
      inset={0}
      zIndex="modal"
      bg="bg"
      color="fg"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={8}
      px={6}
      fontFamily="mono"
    >
      <Stack id="entry-language-title" gap={1} textAlign="center" textTransform="uppercase" letterSpacing="0.2em">
        <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium">{t('title')}</Text>
        <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="medium">{t('titleAlt')}</Text>
      </Stack>
      <Stack role="radiogroup" aria-labelledby="entry-language-title" gap={3} w="min(340px, 100%)">
        {LANGUAGES.map((item, index) => {
          const checked = index === selected
          return (
            <Box
              key={item.code}
              asChild
              position="relative"
              display="flex"
              alignItems="center"
              gap={3}
              minH="56px"
              pl={10}
              pr={4}
              borderRadius="md"
              borderWidth={checked ? '2px' : '1px'}
              borderColor={checked ? 'fg.muted' : { base: 'fg.700/20', _dark: 'fg.200/20' }}
              bg={checked ? { base: 'white/70', _dark: 'bg/70' } : { base: 'white/45', _dark: 'bg/45' }}
              shadow={checked ? 'md' : 'sm'}
              cursor="pointer"
              textAlign="start"
              _hover={{ borderColor: 'fg.muted' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'fg.muted', outlineOffset: '3px' }}
            >
              <button
                ref={(element) => {
                  buttons.current[index] = element
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                data-language={item.code}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => confirm(index)}
              >
                <Box
                  aria-hidden="true"
                  position="absolute"
                  left={4}
                  top="50%"
                  mt="-0.6em"
                  fontSize="lg"
                  lineHeight="1.2"
                  opacity={checked ? 1 : 0}
                >
                  ▶
                </Box>
                <Text asChild fontSize={{ base: 'xl', md: '2xl' }} fontWeight="medium">
                  <span>{t(item.code)}</span>
                </Text>
                <Text asChild ml="auto" fontSize="xs" letterSpacing="0.14em" color="fg.muted">
                  <span>{item.short}</span>
                </Text>
              </button>
            </Box>
          )
        })}
      </Stack>
      <Text fontSize="xs" color="fg.muted" textAlign="center" textTransform="uppercase" letterSpacing="0.16em">
        {selected === 0 ? t('hint') : t('hintAlt')}
      </Text>
    </Box>
  )
}
