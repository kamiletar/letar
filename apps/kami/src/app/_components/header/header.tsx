import { Link } from '@/i18n/navigation'
import { Box, Flex, Heading, HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { LanguageSwitcher } from '../language-switcher'
import { MobileMenu } from '../mobile-menu'
import { AuthButton } from './auth-button'
import { NavLinks } from './nav-links'

export const Header = () => {
  return (
    <Box
      as="header"
      role="banner"
      position="sticky"
      top={0}
      zIndex={20}
      bg={{ base: 'white/20', _dark: 'bg/42' }}
      backdropFilter="blur(10px)"
      borderBottom="1px solid"
      borderColor={{ base: 'white/15', _dark: 'border.subtle/30' }}
      transitionProperty="background-color"
      transitionDuration="0.3s"
      transitionTimingFunction="ease"
      _hover={{ bg: { base: 'white/40', _dark: 'bg/85' } }}
    >
      {/* Mobile: hamburger + logo + actions */}
      <Flex display={{ base: 'flex', md: 'none' }} alignItems="center" justifyContent="space-between" p={3}>
        <MobileMenu />
        <Link href="/" aria-label="Главная страница">
          <Heading size="lg" fontFamily="mono" color="fg">
            Kami
          </Heading>
        </Link>
        <HStack gap={1} role="group" aria-label="Настройки">
          <AuthButton />
          <LanguageSwitcher />
          <ColorModeButton />
        </HStack>
      </Flex>

      {/* Desktop: full navigation */}
      <Flex display={{ base: 'none', md: 'flex' }} alignItems="center" justifyContent="space-between" px={6} py={3}>
        <Link href="/" aria-label="Главная страница">
          <Heading size="xl" fontFamily="mono" color="fg">
            Kami
          </Heading>
        </Link>

        <HStack as="nav" role="navigation" aria-label="Основная навигация" gap={6}>
          <NavLinks />
        </HStack>

        <HStack gap={2} role="group" aria-label="Настройки">
          <AuthButton />
          <LanguageSwitcher />
          <ColorModeButton />
        </HStack>
      </Flex>
    </Box>
  )
}
