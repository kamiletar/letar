import { FadeInSection } from '@/app/_components/fade-in-section'
import { ParallaxImage } from '@/app/_components/parallax-image'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

/** Изображения мандал */
const mandalaImages = [
  { src: '/api/files/mandalas/flower_of_sun.png', altKey: 'mandala1Alt' },
  { src: '/api/files/mandalas/peach_circus.png', altKey: 'mandala2Alt' },
  { src: '/api/files/mandalas/flower_off_life_little.png', altKey: 'mandala3Alt' },
  { src: '/api/files/mandalas/space_avoska.png', altKey: 'mandala4Alt' },
  { src: '/api/files/mandalas/metatrone_cube.png', altKey: 'mandala5Alt' },
  { src: '/api/files/mandalas/astra_portal.png', altKey: 'mandala6Alt' },
  { src: '/api/files/mandalas/om_friendship.png', altKey: 'mandala7Alt' },
] as const

/**
 * Генерация метаданных с учётом локали
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'aboutMandalas' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/about-mandalas',
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
  }
}

/**
 * Компонент для отображения мандалы с анимацией
 */
function MandalaImage({ src, alt, index }: { src: string; alt: string; index: number }) {
  // Чередуем направление появления
  const direction = index % 2 === 0 ? 'left' : 'right'

  return (
    <FadeInSection direction={direction} delay={0.1}>
      <Box my={{ base: 4, md: 6 }} display="flex" justifyContent="center">
        <ParallaxImage
          src={src}
          alt={alt}
          width={{ base: '200px', sm: '250px', md: '300px' }}
          height={{ base: '200px', sm: '250px', md: '300px' }}
          borderRadius="lg"
          speed={0.2}
        />
      </Box>
    </FadeInSection>
  )
}

export default async function AboutMandalasPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('aboutMandalas')

  return (
    <Container maxW="85ch" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <FadeInSection direction="down" delay={0.1}>
        <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="fg" mb={{ base: 4, md: 8 }}>
          {t('title')}
        </Heading>
      </FadeInSection>

      <VStack gap={0} align="stretch" fontSize={{ base: 'md', md: 'lg' }} color="fg.muted" lineHeight="1.8">
        {/* Фото Юнга с параллакс-эффектом */}
        <FadeInSection delay={0.2}>
          <Box my={{ base: 4, md: 6 }} display="flex" justifyContent="center">
            <ParallaxImage
              src="/api/files/content/KGUng.jpg"
              alt={t('jungPhotoAlt')}
              width={{ base: '200px', sm: '250px', md: '300px' }}
              height={{ base: '280px', sm: '330px', md: '400px' }}
              borderRadius="lg"
              speed={0.3}
              scaleOnScroll
            />
          </Box>
        </FadeInSection>

        <FadeInSection delay={0.3}>
          <Heading as="h2" size={{ base: 'lg', md: 'xl' }} color="fg" mt={{ base: 4, md: 8 }} mb={{ base: 2, md: 4 }}>
            {t('jungTitle')}
          </Heading>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p1')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[0].src} alt={t(mandalaImages[0].altKey)} index={0} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p2')}</Text>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p3')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[1].src} alt={t(mandalaImages[1].altKey)} index={1} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p4')}</Text>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p5')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[2].src} alt={t(mandalaImages[2].altKey)} index={2} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p6')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[3].src} alt={t(mandalaImages[3].altKey)} index={3} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p7')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[4].src} alt={t(mandalaImages[4].altKey)} index={4} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p8')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[5].src} alt={t(mandalaImages[5].altKey)} index={5} />

        <FadeInSection delay={0.1}>
          <Text mb={4}>{t('p9')}</Text>
        </FadeInSection>

        <MandalaImage src={mandalaImages[6].src} alt={t(mandalaImages[6].altKey)} index={6} />
      </VStack>
    </Container>
  )
}
