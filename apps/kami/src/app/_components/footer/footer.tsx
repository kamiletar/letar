'use client'

import { CookieSettingsButton } from '@/app/_components/cookie-settings-button'
import { Link } from '@/i18n/navigation'
import { getPublicNavigation } from '@/lib/public-navigation'
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
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useNow } from '@letar/hooks/utility'
import { BuildVersion, StudioCredit } from '@letar/ui'
import { Mail, Rss } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import packageJson from '../../../../package.json'
import { SocialLinks } from './social-links'

export function Footer() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const currentYear = useNow().getFullYear()

  return (
    <Box as="footer" role="contentinfo" mt="auto" borderTop="1px solid" borderColor="border.subtle" bg="bg.subtle">
      <Container maxW="6xl" minW={0} py={12} pb="max(3rem, env(safe-area-inset-bottom))">
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
            {getPublicNavigation(locale).map((link) => (
              // trailingSlash:true не проходит через клиентскую навигацию next/link
              <ChakraLink key={link.href} asChild minH="44px" display="inline-flex" alignItems="center">
                <Link href={link.href}>
                  <Text
                    fontSize="sm"
                    color="fg.muted"
                    _hover={{ color: 'fg.500' }}
                    transitionProperty="color"
                    transitionDuration="fast"
                  >
                    {tNav(link.key)}
                  </Text>
                </Link>
              </ChakraLink>
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
                transitionProperty="color"
                transitionDuration="fast"
                aria-label={t('emailAria')}
                minH="44px"
                overflowWrap="anywhere"
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
                transitionProperty="color"
                transitionDuration="fast"
                aria-label={t('rssAria')}
                minH="44px"
              >
                {t('rssFeed')}
              </ChakraLink>
            </HStack>
          </VStack>
        </SimpleGrid>

        <Separator my={8} />

        <Stack
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'center', md: 'start' }}
          justify="space-between"
          gap={4}
          minW={0}
        >
          <Text fontSize="sm" color="fg.muted">
            © {currentYear} Kami. {t('copyright')}.
          </Text>
          <HStack
            gap={{ base: 3, md: 4 }}
            flexWrap="wrap"
            justify={{ base: 'center', md: 'end' }}
            minW={0}
            maxW="full"
            textAlign={{ base: 'center', md: 'start' }}
            css={{
              '& a, & button': {
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            }}
          >
            <ChakraLink asChild minH="44px">
              <Link href="/humans.txt">
                <Text fontSize="sm" color="fg.muted" _hover={{ color: 'fg' }}>
                  humans.txt
                </Text>
              </Link>
            </ChakraLink>
            <CookieSettingsButton />
            <Text fontSize="sm" color="fg.muted" minW={0}>
              {t('madeWith')} ❤️ & Claude Code
            </Text>
            <StudioCredit app="kami" minW={0} overflowWrap="anywhere" />
            <BuildVersion version={packageJson.version} whiteSpace="nowrap" />
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}
