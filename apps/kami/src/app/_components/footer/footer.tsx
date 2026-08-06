'use client'

import { CookieSettingsButton } from '@/app/_components/cookie-settings-button'
import { Link } from '@/i18n/navigation'
import { CONTACT } from '@/lib/utils/constants'
import {
  Box,
  Container,
  Heading,
  HStack,
  Icon,
  Link as ChakraLink,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { BuildVersion, StudioCredit } from '@letar/ui'
import { Mail, Rss } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import packageJson from '../../../../package.json'
import { SocialLinks } from './social-links'

/**
 * Ссылки навигации в футере
 */
const navLinks = [
  { href: '/about', labelKey: 'about' },
  { href: '/blog', labelKey: 'blog' },
  { href: '/projects', labelKey: 'projects' },
  { href: '/consulting', labelKey: 'consulting' },
] as const

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const currentYear = new Date().getFullYear()

  return (
    <Box as="footer" role="contentinfo" mt="auto" borderTop="1px solid" borderColor="border.subtle" bg="bg.subtle">
      <Container maxW="6xl" py={12}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
          {/* Колонка 1: Бренд */}
          <VStack align={{ base: 'center', md: 'start' }} gap={4}>
            <Heading size="lg" fontFamily="mono" color="fg">
              Kami
            </Heading>
            <Text color="fg.muted" fontSize="sm" maxW="250px" textAlign={{ base: 'center', md: 'start' }}>
              Software Architect
            </Text>
            <SocialLinks />
          </VStack>

          {/* Колонка 2: Навигация */}
          <VStack
            as="nav"
            role="navigation"
            aria-label={t('navigation')}
            align={{ base: 'center', md: 'start' }}
            gap={3}
          >
            <Text fontWeight="semibold" color="fg" mb={1}>
              {t('navigation')}
            </Text>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Text fontSize="sm" color="fg.muted" _hover={{ color: 'fg.500' }} transition="color 0.2s">
                  {tNav(link.labelKey)}
                </Text>
              </Link>
            ))}
          </VStack>

          {/* Колонка 3: Контакт */}
          <VStack align={{ base: 'center', md: 'start' }} gap={3}>
            <Text fontWeight="semibold" color="fg" mb={1}>
              {t('contact')}
            </Text>
            <HStack gap={2}>
              <Icon boxSize={4} color="fg.muted">
                <Mail />
              </Icon>
              <ChakraLink
                href={`mailto:${CONTACT.email}`}
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg.500' }}
                transition="color 0.2s"
                aria-label={t('emailAria')}
              >
                {CONTACT.email}
              </ChakraLink>
            </HStack>
            <HStack gap={2}>
              <Icon boxSize={4} color="fg.muted">
                <Rss />
              </Icon>
              <ChakraLink
                href={`/${locale}/feed.xml/`}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg.500' }}
                transition="color 0.2s"
                aria-label={t('rssAria')}
              >
                {t('rssFeed')}
              </ChakraLink>
            </HStack>
          </VStack>
        </SimpleGrid>

        <Separator my={8} />

        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Text fontSize="sm" color="fg.muted">
            © {currentYear} Kami. {t('copyright')}.
          </Text>
          <HStack gap={4}>
            <Link href="/humans.txt">
              <Text fontSize="sm" color="fg.muted" _hover={{ color: 'fg' }}>
                humans.txt
              </Text>
            </Link>
            <CookieSettingsButton />
            <Text fontSize="sm" color="fg.muted">
              {t('madeWith')} ❤️ & Claude Code
            </Text>
            <StudioCredit app="kami" />
            <BuildVersion version={packageJson.version} />
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
