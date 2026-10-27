import { SiteCtaLink } from '@/app/[locale]/site/_components/site-cta-link'
import { TypedText } from '@/app/[locale]/site/_components/typed-text'
import portrait from '@/assets/site/portrait.webp'
import { getStudioServicesUrl } from '@/lib/public-navigation'
import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'
import Image from 'next/image'

/** Первый экран: фото, заголовок оффера, один CTA в студию. */
export async function OfferHero() {
  const locale = await getLocale()
  const t = await getTranslations('site')

  return (
    <Box py={{ base: 8, md: 16 }}>
      <Container maxW="5xl" px={{ base: 6, md: 12 }}>
        <Flex
          asChild
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'start', md: 'center' }}
          gap={{ base: 6, md: 12 }}
        >
          <section aria-labelledby="site-title">
            <Box
              flexShrink={0}
              w={{ base: '160px', md: '280px' }}
              overflow="hidden"
              borderRadius="xl"
              borderWidth="1px"
              borderColor={{ base: 'fg.700/20', _dark: 'fg.200/20' }}
              shadow="md"
              bg="black"
            >
              <Image
                src={portrait}
                alt={t('portraitAlt')}
                priority
                sizes="(min-width: 768px) 280px, 160px"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </Box>
            <Stack gap={5} maxW="680px" align="start">
              <Heading asChild size={{ base: '3xl', md: '5xl' }} lineHeight={1.15} textWrap="balance">
                <h1 id="site-title">
                  <TypedText text={t('heroTitle')} />
                </h1>
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="tall" textWrap="pretty">
                <TypedText text={t('heroSubtitle')} delay={t('heroTitle').length * 28} />
              </Text>
              <SiteCtaLink href={getStudioServicesUrl(locale, 'hero')} label={t('cta')} place="hero" />
            </Stack>
          </section>
        </Flex>
      </Container>
    </Box>
  )
}
