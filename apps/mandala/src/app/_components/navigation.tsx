'use client'

import { Link as LocalizedLink, usePathname } from '@/i18n/navigation'
import { Box, Container, Flex, Link, Text } from '@chakra-ui/react'
import { useScrollDirection } from '@letar/hooks'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { AuthButton } from './auth-button'
import { CartIcon } from './cart'
import { LanguageSwitcher } from './language-switcher'
import { MobileMenu } from './mobile-menu'
import { ThemeSwitcher } from './ui/theme-switcher'

const MotionBox = motion.create(Box)

/** Ключи пунктов навигации */
const navItemKeys = [
  { href: '/', key: 'home' },
  { href: '/mandalas', key: 'gallery' },
  { href: '/shop', key: 'shop' },
  { href: '/about-elfafeya', key: 'aboutArtist' },
  { href: '/about-mandalas', key: 'aboutMandalas' },
  { href: '/contacts', key: 'contacts' },
] as const

/** Варианты отображения навигации */
type NavigationVariant = 'full' | 'minimal' | 'hidden'

interface NavigationProps {
  /** Вариант отображения: full (все пункты), minimal (logo + burger), hidden (скрыт) */
  variant?: NavigationVariant
  /** Скрывать при скролле вниз, показывать при скролле вверх */
  hideOnScroll?: boolean
}

/**
 * Компонент навигации с поддержкой вариантов и скрытия при скролле.
 */
export function Navigation({ variant = 'full', hideOnScroll = false }: NavigationProps) {
  const pathname = usePathname()
  const scrollDirection = useScrollDirection()
  const t = useTranslations('nav')

  // Если вариант hidden — не рендерим
  if (variant === 'hidden') {
    return null
  }

  // Определяем видимость при скролле
  const isHidden = hideOnScroll && scrollDirection === 'down'

  return (
    <MotionBox
      as="header"
      bg="bg.nav"
      backdropFilter="blur(10px)"
      borderBottom="1px solid"
      borderColor="border.subtle"
      position="sticky"
      top={0}
      zIndex={100}
      initial={{ y: 0 }}
      animate={{ y: isHidden ? -100 : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" py={4}>
          {/* Логотип */}
          <Link asChild>
            <LocalizedLink href="/">
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                Elfafeya Art
              </Text>
            </LocalizedLink>
          </Link>

          {/* Полный вариант — все пункты меню (скрыто до lg, т.к. много пунктов) */}
          {variant === 'full' && (
            <Flex gap={6} display={{ base: 'none', lg: 'flex' }} align="center">
              {navItemKeys.map((item) => {
                const isActive = pathname === item.href
                // Добавляем data-onboarding для галереи (первый шаг онбординга)
                const onboardingAttr = item.href === '/mandalas' ? { 'data-onboarding': 'gallery-link' } : {}
                return (
                  <Link key={item.href} asChild>
                    <LocalizedLink href={item.href} {...onboardingAttr}>
                      <Text
                        fontSize="md"
                        fontWeight={isActive ? 'bold' : 'normal'}
                        color={isActive ? 'fg.brand' : 'fg'}
                        transition="all 0.2s"
                        _hover={{
                          color: 'fg.brand',
                          transform: 'translateY(-2px)',
                        }}
                      >
                        {t(item.key)}
                      </Text>
                    </LocalizedLink>
                  </Link>
                )
              })}
              <LanguageSwitcher />
              <ThemeSwitcher />
              <CartIcon />
              <AuthButton />
            </Flex>
          )}

          {/* Минимальный вариант — только корзина и burger */}
          {variant === 'minimal' && (
            <Flex display={{ base: 'none', lg: 'flex' }} gap={2} align="center">
              <ThemeSwitcher />
              <CartIcon />
              <MobileMenu />
            </Flex>
          )}

          {/* Мобильная версия — burger меню (до lg) */}
          <Flex display={{ base: 'flex', lg: 'none' }} gap={2} align="center">
            <ThemeSwitcher />
            <CartIcon />
            <MobileMenu />
          </Flex>
        </Flex>
      </Container>
    </MotionBox>
  )
}
