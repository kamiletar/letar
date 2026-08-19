import { Link } from '@/i18n/navigation'
import { createLocalizer } from '@/lib/localized-text'
import { prisma } from '@/lib/prisma'
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Link as ChakraLink,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Code } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { CATEGORY_ICONS, LEVEL_COLORS, LEVEL_NAMES } from './_constants'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'skills' })

  return {
    title: t('title'),
    description: locale === 'ru'
      ? 'Технологии и инструменты, с которыми работает Ками: React, Next.js, TypeScript и другие'
      : 'Technologies and tools Kami works with: React, Next.js, TypeScript and more',
    alternates: {
      canonical: `/${locale}/skills`,
      languages: { ru: '/ru/skills', en: '/en/skills' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/skills` },
  }
}

/** Вычисляет количество лет опыта */
function getYearsOfExperience(skill: { years: number | null; startYear: number | null }): number | null {
  // Приоритет: startYear (автоматический расчёт) > years (ручной ввод)
  if (skill.startYear) {
    const currentYear = new Date().getFullYear()
    return Math.max(0, currentYear - skill.startYear)
  }
  return skill.years
}

export default async function SkillsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const categories = await prisma.skillCategory.findMany({
    orderBy: { order: 'asc' },
    include: {
      skills: {
        orderBy: { order: 'asc' },
      },
    },
  })

  const t = await getTranslations('skills')
  const currentLocale = await getLocale()
  const l = createLocalizer(currentLocale)

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="6xl">
        <VStack gap={{ base: 12, md: 16 }} align="stretch">
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="fg.subtle" maxW="2xl">
              {l('Технологии и инструменты, с которыми я работаю', 'Technologies and tools I work with')}
            </Text>
          </VStack>

          {/* Категории навыков */}
          {categories.length === 0 && (
            <VStack py={16} gap={4} textAlign="center">
              <Text fontSize="lg" color="fg.muted">
                {l('Скоро здесь появится контент', 'Content coming soon')}
              </Text>
            </VStack>
          )}
          {categories.map((category) => (
            <VStack key={category.id} gap={6} align="stretch">
              {/* Заголовок категории */}
              <HStack gap={3}>
                <Box color="fg.500">{category.icon && CATEGORY_ICONS[category.icon]}</Box>
                <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }}>
                  {l(category.name, category.nameEn)}
                </Heading>
                <Badge colorPalette="fg" variant="subtle">
                  {category.skills.length}
                </Badge>
              </HStack>

              {/* Сетка навыков */}
              <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
                {category.skills.map((skill) => (
                  <Box
                    key={skill.id}
                    p={4}
                    borderRadius="lg"
                    bg={{ base: 'white', _dark: 'gray.900' }}
                    border="1px solid"
                    borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
                    _hover={{
                      borderColor: 'fg.500',
                      transform: 'translateY(-2px)',
                      boxShadow: 'md',
                    }}
                    transitionProperty="border-color, transform, box-shadow"
                    transitionDuration="0.2s"
                    position="relative"
                  >
                    {skill.featured && (
                      <Box position="absolute" top={2} right={2} w={2} h={2} borderRadius="full" bg="fg.500" />
                    )}
                    <VStack align="start" gap={2}>
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="semibold" fontSize="md">
                          {skill.name}
                        </Text>
                        {skill.url && (
                          <ChakraLink href={skill.url} target="_blank" rel="noopener noreferrer" color="gray.400">
                            <Code size={14} />
                          </ChakraLink>
                        )}
                      </HStack>

                      <HStack gap={2} flexWrap="wrap">
                        <Badge colorPalette={LEVEL_COLORS[skill.level]} size="sm">
                          {l(LEVEL_NAMES[skill.level].ru, LEVEL_NAMES[skill.level].en)}
                        </Badge>
                        {(() => {
                          const years = getYearsOfExperience(skill)
                          return years
                            ? (
                              <Text fontSize="xs" color="fg.subtle">
                                {years}+ {l('лет', 'years')}
                              </Text>
                            )
                            : null
                        })()}
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </VStack>
          ))}

          {/* CTA */}
          <HStack justify="center" gap={4}>
            <Button asChild variant="outline" size="lg" borderColor="fg.500" color="fg.500">
              <Link href="/projects">{l('Смотреть проекты', 'View Projects')}</Link>
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
