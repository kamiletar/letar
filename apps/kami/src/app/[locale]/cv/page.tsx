import { calculateAge, calculateYearsOfExperience } from '@/lib/date-utils'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ExperienceSection, PersonalInfoSection, TechStackSection } from './_components'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cv' })

  return {
    title: t('title'),
    description: locale === 'ru'
      ? 'Резюме Ками Летар — Software Architect с 8+ годами опыта разработки'
      : 'Resume of Kami Letar — Software Architect with 8+ years of development experience',
    alternates: {
      canonical: `/${locale}/cv`,
      languages: { ru: '/ru/cv', en: '/en/cv' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/cv` },
  }
}

export default async function CVPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <CVContent />
}

function CVContent() {
  const t = useTranslations('cv')

  // Дата рождения: 22 декабря 1987
  const birthDate = new Date(1987, 11, 22)
  const age = calculateAge(birthDate)

  // Опыт React: с декабря 2016
  const reactStartDate = new Date(2016, 11, 1)
  const reactYears = calculateYearsOfExperience(reactStartDate)

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="4xl">
        <VStack gap={{ base: 10, md: 14 }} align="stretch">
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize={{ base: 'xl', md: '2xl' }} color="fg.500" fontFamily="mono">
              {t('position')}
            </Text>
          </VStack>

          {/* Личная информация */}
          <PersonalInfoSection t={t} age={age} reactYears={reactYears} />

          {/* Актуальный стек */}
          <TechStackSection t={t} />

          {/* Опыт работы */}
          <ExperienceSection t={t} />
        </VStack>
      </Container>
    </Box>
  )
}
