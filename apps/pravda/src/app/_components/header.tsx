'use client'

import { Box, Container, Heading, HStack, IconButton, Kbd, Link } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import Image from 'next/image'
import NextLink from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuBookmark, LuSearch } from 'react-icons/lu'

import { CommandPalette } from './command-palette'
import { NetworkStatusIndicator } from './network-status-indicator'
import { MobileSidebar } from './sidebar'

/**
 * Skip Link — позволяет пользователям клавиатуры пропустить навигацию.
 * Скрыт визуально, появляется при фокусе.
 */
function SkipLink() {
  return (
    <Link
      href="#main-content"
      position="absolute"
      top="-100px"
      left="50%"
      transform="translateX(-50%)"
      zIndex="skipLink"
      bg="brand.500"
      color="white"
      px={4}
      py={2}
      borderRadius="md"
      fontWeight="semibold"
      _focus={{
        top: '10px',
        outline: 'none',
        boxShadow: '0 0 0 3px var(--chakra-colors-brand-300)',
      }}
      transition="top 0.2s ease"
    >
      Перейти к содержимому
    </Link>
  )
}

/**
 * Шапка сайта.
 * Содержит логотип, название и кнопку переключения темы.
 * Поддерживает Command Palette (Cmd+K / Ctrl+K).
 */
export function Header() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Глобальный keyboard listener для Cmd+K / Ctrl+K
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Box
      as="header"
      role="banner"
      position="sticky"
      top={0}
      zIndex="sticky"
      bg="bg.panel"
      borderBottomWidth="1px"
      borderBottomColor="border"
      h="60px"
    >
      {/* Skip Link для пропуска навигации (a11y) */}
      <SkipLink />
      <Container maxW="container.2xl" h="full">
        <HStack h="full" justify="space-between">
          {/* Левая часть: мобильное меню + логотип */}
          <HStack gap={3}>
            <MobileSidebar />

            <Link asChild _hover={{ textDecoration: 'none' }}>
              <NextLink href="/">
                <HStack gap={2}>
                  <Image src="/het.svg" alt="Герб" width={32} height={32} />
                  <Heading
                    as="span"
                    size="md"
                    fontWeight="bold"
                    color="brand.600"
                    _dark={{ color: 'brand.400' }}
                    display={{ base: 'none', sm: 'block' }}
                  >
                    Свод законов России
                  </Heading>
                </HStack>
              </NextLink>
            </Link>
          </HStack>

          {/* Правая часть: индикатор сети + закладки + поиск + кнопка темы */}
          <HStack gap={2}>
            <NetworkStatusIndicator />

            <Link asChild>
              <NextLink href="/bookmarks">
                <IconButton aria-label="Закладки" title="Закладки" variant="ghost" size="sm">
                  <LuBookmark />
                </IconButton>
              </NextLink>
            </Link>

            {/* Кнопка поиска с подсказкой Cmd+K */}
            <HStack
              as="button"
              onClick={() => setCommandPaletteOpen(true)}
              gap={2}
              px={3}
              py={1.5}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border"
              bg="bg"
              color="fg.muted"
              fontSize="sm"
              cursor="pointer"
              transition="all 0.2s ease"
              _hover={{ borderColor: 'brand.500', color: 'fg.default' }}
              display={{ base: 'none', md: 'flex' }}
            >
              <LuSearch />
              <Box as="span" display={{ base: 'none', lg: 'inline' }}>
                Поиск...
              </Box>
              <Kbd size="sm" display={{ base: 'none', lg: 'flex' }}>
                ⌘K
              </Kbd>
            </HStack>

            {/* Мобильная кнопка поиска */}
            <IconButton
              aria-label="Поиск"
              title="Поиск (⌘K)"
              variant="ghost"
              size="sm"
              display={{ base: 'flex', md: 'none' }}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <LuSearch />
            </IconButton>

            <ColorModeButton />
          </HStack>
        </HStack>
      </Container>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </Box>
  )
}
