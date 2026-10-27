import { SiteCtaLink } from '@/app/[locale]/site/_components/site-cta-link'
import { getStudioServicesUrl } from '@/lib/public-navigation'
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { getLocale, getTranslations } from 'next-intl/server'

/** Финальный призыв, та же страница студии, что и в hero. */
export async function OfferFinalCta() {
  const locale = await getLocale()
  const t = await getTranslations('site')
  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="3xl" px={{ base: 6, md: 12 }}>
        <Stack asChild gap={4} align="start">
          <section aria-labelledby="site-final-title">
            <Heading asChild size="2xl" textWrap="balance">
              <h2 id="site-final-title">{t('finalTitle')}</h2>
            </Heading>
            <Text color="fg.muted" fontSize="lg" lineHeight="tall" textWrap="pretty">{t('finalText')}</Text>
            <SiteCtaLink href={getStudioServicesUrl(locale, 'final')} label={t('cta')} place="final" />
          </section>
        </Stack>
      </Container>
    </Box>
  )
}
