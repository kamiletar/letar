'use client'

import { Box, Text } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuGlobe } from 'react-icons/lu'

import { usePathname, useRouter } from '@/i18n/navigation'
import { ALL_LOCALES, type Locale, LOCALE_NAMES } from '@/i18n/routing'

/**
 * Переключатель языка интерфейса.
 * Dropdown со всеми поддерживаемыми локалями на их родном языке.
 */
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
    [router, pathname],
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

  /** Закрыть по Escape */
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
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1}
        borderRadius="md"
        fontSize="sm"
        color="fg.muted"
        cursor="pointer"
        _hover={{ color: 'fg' }}
        asChild
      >
        <button type="button" aria-label="Change language" onClick={() => setIsOpen(!isOpen)}>
          <LuGlobe size={16} />
          <Text fontSize="xs" textTransform="uppercase">
            {locale}
          </Text>
        </button>
      </Box>

      {isOpen && (
        <Box
          role="listbox"
          position="absolute"
          top="100%"
          insetInlineEnd={0}
          mt={1}
          bg="bg.surface"
          borderRadius="md"
          shadow="lg"
          border="1px solid"
          borderColor="border"
          maxH="400px"
          overflowY="auto"
          zIndex={100}
          minW="180px"
          py={1}
        >
          {ALL_LOCALES.map((loc) => (
            <Box
              key={loc}
              display="block"
              w="100%"
              textAlign="start"
              px={3}
              py={1.5}
              fontSize="sm"
              cursor="pointer"
              bg={loc === locale ? 'brand.subtle' : 'transparent'}
              fontWeight={loc === locale ? '600' : '400'}
              color={loc === locale ? 'brand.fg' : 'fg'}
              _hover={{ bg: 'bg.subtle' }}
              asChild
            >
              <button
                type="button"
                role="option"
                aria-selected={loc === locale}
                onClick={() => handleSelect(loc)}
              >
                <Text as="span" fontSize="xs" color="fg.subtle" mr={2}>
                  {loc.toUpperCase()}
                </Text>
                {LOCALE_NAMES[loc]}
              </button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
