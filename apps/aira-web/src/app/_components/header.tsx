'use client'

import { Box, Container, Flex, HStack, IconButton, Link } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuMenu, LuX } from 'react-icons/lu'

import { LocaleSwitcher } from './locale-switcher'

/**
 * Навигационный хедер с мобильным меню
 */
export function Header() {
  const t = useTranslations('nav')
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '#features', label: t('features') },
    { href: '#security', label: t('security') },
    { href: '#download', label: t('download') },
    {
      href: 'https://github.com/kamiletar/aira',
      label: t('github'),
      external: true,
    },
  ]

  return (
    <Box position="fixed" top={0} left={0} right={0} zIndex={50} backdropFilter="blur(12px)" bg="bg.surface/80" asChild>
      <header>
        <Container maxW="6xl">
          <Flex h={16} align="center" justify="space-between">
            <Link href="/" fontWeight="bold" fontSize="xl" _hover={{ textDecoration: 'none' }} color="fg">
              aira
            </Link>

            {/* Десктоп навигация */}
            <HStack gap={6} display={{ base: 'none', md: 'flex' }}>
              <HStack gap={6} asChild>
                <nav aria-label={t('mainNavigation')}>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      color="fg.muted"
                      _hover={{ color: 'fg' }}
                      fontSize="sm"
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </HStack>
              <LocaleSwitcher />
            </HStack>

            {/* Мобильная кнопка меню */}
            <HStack gap={2} display={{ base: 'flex', md: 'none' }}>
              <LocaleSwitcher />
              <IconButton
                aria-label={isOpen ? t('closeMenu') : t('openMenu')}
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <LuX size={20} /> : <LuMenu size={20} />}
              </IconButton>
            </HStack>
          </Flex>

          {/* Мобильное меню */}
          {isOpen && (
            <Box
              display={{ base: 'block', md: 'none' }}
              pb={4}
              borderTop="1px solid"
              borderColor="border.muted"
              asChild
            >
              <nav aria-label={t('mobileNavigation')}>
                <Flex direction="column" gap={3} pt={3}>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      color="fg.muted"
                      _hover={{ color: 'fg' }}
                      fontSize="sm"
                      py={2}
                      onClick={() => setIsOpen(false)}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Flex>
              </nav>
            </Box>
          )}
        </Container>
      </header>
    </Box>
  )
}
