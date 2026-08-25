import { Link as IntlLink } from '@/i18n/navigation'
import { Box, Container, Flex, HStack, Link, Text } from '@chakra-ui/react'
import { CookieSettingsButton, TouchLink } from '@letar/ui'
import { getTranslations } from 'next-intl/server'

/**
 * Footer сайта с semantic HTML
 */
export async function Footer() {
  const t = await getTranslations('footer')

  return (
    <Box py={8} borderTop="1px solid" borderColor="border.muted" asChild>
      <footer>
        <Container maxW="6xl">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Text fontSize="sm" color="fg.muted">
              {t('license')}
            </Text>
            <HStack gap={6}>
              <Link
                href="https://github.com/kamiletar/aira"
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg' }}
              >
                {t('github')}
              </Link>
              <Link
                href="https://github.com/kamiletar/aira/blob/main/SPEC.md"
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg' }}
              >
                {t('spec')}
              </Link>
              <Link
                href="https://github.com/kamiletar/aira/releases"
                target="_blank"
                rel="noopener noreferrer"
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg' }}
              >
                {t('releases')}
              </Link>
              <TouchLink
                href="/privacy"
                linkComponent={IntlLink}
                fontSize="sm"
                color="fg.muted"
                _hover={{ color: 'fg' }}
              >
                Privacy
              </TouchLink>
              <CookieSettingsButton appKey="aira-web" />
            </HStack>
          </Flex>
        </Container>
      </footer>
    </Box>
  )
}
