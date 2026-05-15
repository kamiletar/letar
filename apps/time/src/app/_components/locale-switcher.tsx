'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { ALL_LOCALES, type Locale } from '@/i18n/routing'
import { Box, Text } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuGlobe } from 'react-icons/lu'

/** Нативные названия языков */
const LOCALE_NAMES: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
  ko: '한국어',
  es: 'Español',
  pt: 'Português',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  pl: 'Polski',
  uk: 'Українська',
  be: 'Беларуская',
  kk: 'Қазақша',
  uz: 'Oʻzbekcha',
  tg: 'Тоҷикӣ',
  ky: 'Кыргызча',
  tk: 'Türkmençe',
  az: 'Azərbaycanca',
  hy: 'Հայերեն',
  ka: 'ქართული',
  ro: 'Română',
  fa: 'فارسی',
  bn: 'বাংলা',
  id: 'Indonesia',
  ms: 'Melayu',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  sw: 'Kiswahili',
  nl: 'Nederlands',
  sv: 'Svenska',
  it: 'Italiano',
  el: 'Ελληνικά',
  he: 'עברית',
  ur: 'اردو',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
}

/** Селектор языка — выпадающий список */
export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSelect = useCallback(
    (newLocale: Locale) => {
      router.replace(pathname, { locale: newLocale })
      setIsOpen(false)
    },
    [router, pathname]
  )

  const handleMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setIsOpen(false), 300)
  }

  /** Закрытие по Escape */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <Box position="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Box
        as="button"
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1}
        borderRadius="md"
        fontSize="sm"
        cursor="pointer"
        opacity={0.7}
        _hover={{ opacity: 1 }}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LuGlobe size={16} />
        <Text fontSize="xs">{locale.toUpperCase()}</Text>
      </Box>

      {isOpen && (
        <Box
          role="listbox"
          aria-label="Languages"
          position="absolute"
          top="100%"
          right={0}
          mt={1}
          bg="bg.surface"
          borderRadius="md"
          shadow="lg"
          border="1px solid"
          borderColor="border"
          maxH="400px"
          overflowY="auto"
          zIndex={100}
          minW="160px"
          py={1}
        >
          {ALL_LOCALES.map((loc) => (
            <Box
              key={loc}
              as="button"
              role="option"
              aria-selected={loc === locale}
              display="block"
              w="100%"
              textAlign="start"
              px={3}
              py={1.5}
              fontSize="sm"
              cursor="pointer"
              bg={loc === locale ? { _light: 'brand.50', _dark: 'brand.950' } : 'transparent'}
              fontWeight={loc === locale ? '600' : '400'}
              _hover={{ bg: { _light: 'gray.100', _dark: 'gray.800' } }}
              onClick={() => handleSelect(loc as Locale)}
            >
              <Text as="span" fontSize="xs" color="fg.subtle" mr={2}>
                {loc.toUpperCase()}
              </Text>
              {LOCALE_NAMES[loc] || loc}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
