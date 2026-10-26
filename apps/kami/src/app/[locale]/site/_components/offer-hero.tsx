import { SiteCtaLink } from '@/app/[locale]/site/_components/site-cta-link'
import portrait from '@/assets/site/portrait.webp'
import { formatOfferPrice, OFFER } from '@/lib/offer'
import { getStudioOrderUrl } from '@/lib/public-navigation'
import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'
import Image from 'next/image'

/** Первый экран: фото, заголовок оффера, один CTA и строка условий только из OFFER. */
export async function OfferHero() {
  const locale = await getLocale()
  const t = await getTranslations('site')
  const proof = [
    OFFER.priceFromRub === null ? null : t('terms.priceValue', { price: formatOfferPrice(locale, OFFER.priceFromRub) }),
    OFFER.weeksFrom === null ? null : t('terms.weeksValue', { weeks: OFFER.weeksFrom }),
  ].filter(Boolean)

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
                <h1 id="site-title">{t('heroTitle')}</h1>
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="tall" textWrap="pretty">
                {t('heroSubtitle')}
              </Text>
              <SiteCtaLink href={getStudioOrderUrl(locale, 'kami')} label={t('cta')} place="hero" />
              {proof.length > 0 && <Text fontSize="sm" color="fg.muted">{proof.join(' · ')}</Text>}
            </Stack>
          </section>
        </Flex>
      </Container>
    </Box>
  )
}
