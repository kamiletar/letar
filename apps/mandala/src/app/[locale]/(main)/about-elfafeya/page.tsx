import { FadeInSection } from '@/app/_components/fade-in-section'
import { ParallaxImage } from '@/app/_components/parallax-image'
import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Генерация метаданных с учётом локали
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'aboutArtist' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/about-elfafeya',
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
  }
}

export default async function AboutElfafeyaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('aboutArtist')

  return (
    <Container maxW="85ch" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <FadeInSection direction="down" delay={0.1}>
        <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="fg" mb={{ base: 4, md: 8 }}>
          {t('title')}
        </Heading>
      </FadeInSection>

      <VStack gap={0} align="stretch" fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="1.8">
        {/* Фото Эльфафеи с параллакс-эффектом */}
        <FadeInSection delay={0.2}>
          <Box my={{ base: 4, md: 6 }} display="flex" justifyContent="center">
            <ParallaxImage
              src="/api/files/content/Elfafeya.jpg"
              alt={t('photoAlt')}
              width={{ base: '100%', sm: '300px', md: '400px' }}
              height={{ base: '400px', sm: '450px', md: '600px' }}
              borderRadius="lg"
              speed={0.3}
              scaleOnScroll
            />
          </Box>
        </FadeInSection>

        <FadeInSection delay={0.3}>
          <Text mb={4}>{t('intro')}</Text>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('portals')}</Text>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <Text mb={4}>
            <Link asChild color="fg" textDecoration="underline" _hover={{ color: 'fg.brand' }}>
              <LocalizedLink href="/about-mandalas">{t('jungLink')}</LocalizedLink>
            </Link>{' '}
            {t('jungText')}
          </Text>
        </FadeInSection>

        <FadeInSection delay={0.1} direction="left">
          <Text mb={4} fontWeight="semibold" color="fg">
            {t('cta1')}
          </Text>
        </FadeInSection>

        <FadeInSection delay={0.15} direction="right">
          <Text mb={4} fontWeight="semibold" color="fg">
            {t('cta2')}
          </Text>
        </FadeInSection>

        <FadeInSection delay={0.2} direction="left">
          <Text mb={4} fontWeight="semibold" color="fg">
            {t('cta3')}
          </Text>
        </FadeInSection>

        {/* Фото рук с параллакс-эффектом */}
        <FadeInSection delay={0.1}>
          <Box mt={{ base: 4, md: 8 }} display="flex" justifyContent="center">
            <ParallaxImage
              src="/api/files/content/Elfafeya_hands.jpg"
              alt={t('handsAlt')}
              width="100%"
              maxW="800px"
              height={{ base: '300px', sm: '400px', md: '600px' }}
              borderRadius="lg"
              speed={0.4}
              scaleOnScroll
            />
          </Box>
        </FadeInSection>
      </VStack>
    </Container>
  )
}
