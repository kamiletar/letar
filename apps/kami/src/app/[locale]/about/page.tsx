import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, HStack, SimpleGrid, VStack } from '@chakra-ui/react'
import { Briefcase, Code, Compass, Layers, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { FeatureCard } from '../../_components/about/feature-card'
import { StatCard } from '../../_components/about/stat-card'
import { PageHero } from '../../_components/page-hero'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })

  return {
    title: t('title'),
    description: locale === 'ru'
      ? `Узнайте больше о Ками — архитекторе ПО с ${new Date().getFullYear() - 2002}+ годами опыта`
      : `Learn more about Kami — a software architect with ${new Date().getFullYear() - 2002}+ years of experience`,
    alternates: {
      canonical: `/${locale}/about`,
      languages: { ru: '/ru/about', en: '/en/about' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/about` },
  }
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AboutContent />
}

function AboutContent() {
  const t = useTranslations('about')

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="6xl">
        <VStack gap={{ base: 12, md: 16 }} align="stretch">
          {/* Hero секция */}
          <PageHero title={t('title')} subtitle={t('subtitle')} description={t('intro')} />

          {/* Статистика */}
          <SimpleGrid columns={{ base: 1, sm: 3 }} gap={6}>
            <StatCard
              value={`${new Date().getFullYear() - 2002}+`}
              label={t('experience')}
              icon={<Briefcase size={24} />}
              index={0}
            />
            <StatCard value="30+" label={t('projects')} icon={<Layers size={24} />} index={1} />
            <StatCard value="50+" label={t('technologies')} icon={<Code size={24} />} index={2} />
          </SimpleGrid>

          {/* Чем занимаюсь */}
          <VStack gap={8} align="stretch">
            <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} textAlign="center">
              {t('whatIDo.title')}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              <FeatureCard
                icon={<Compass size={24} />}
                title={t('whatIDo.architecture.title')}
                description={t('whatIDo.architecture.description')}
              />
              <FeatureCard
                icon={<Code size={24} />}
                title={t('whatIDo.development.title')}
                description={t('whatIDo.development.description')}
              />
              <FeatureCard
                icon={<Users size={24} />}
                title={t('whatIDo.mentoring.title')}
                description={t('whatIDo.mentoring.description')}
              />
            </SimpleGrid>
          </VStack>

          {/* Стек */}
          <VStack
            gap={4}
            p={8}
            borderRadius="xl"
            bg={{ base: 'gray.50', _dark: 'gray.900' }}
            border="1px solid"
            borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
          >
            <Heading as="h3" fontSize="xl">
              {t('stack.title')}
            </Heading>
            <HStack gap={3} flexWrap="wrap" justify="center">
              {t('stack.items')
                .split(', ')
                .map((tech) => (
                  <Box
                    key={tech}
                    px={4}
                    py={2}
                    borderRadius="full"
                    bg={{ base: 'white', _dark: 'gray.800' }}
                    border="1px solid"
                    borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
                    fontSize="sm"
                    fontFamily="mono"
                    _hover={{ borderColor: 'fg.500' }}
                    transitionProperty="border-color"
                    transitionDuration="0.2s"
                  >
                    {tech}
                  </Box>
                ))}
            </HStack>
          </VStack>

          {/* CTA */}
          <HStack justify="center">
            <Button asChild size="lg" colorPalette="fg">
              <Link href="/skills/">{t('cta')}</Link>
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
