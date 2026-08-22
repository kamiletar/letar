import { Link } from '@/i18n/navigation'
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
import { GitHubIcon } from '@letar/auth/client'
import { Pressable } from '@letar/ui'
import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

// Публичная страница со списком из БД, редактируемым через /admin/projects — без force-dynamic
// Next.js кеширует рендер (Full Route Cache) до первого запроса и не видит более поздний сид/правку
// админкой без явного revalidatePath на именно этот locale-путь (см. nextjs-apps.md, тот же класс
// бага что у aboi/catalog и domwellbes/houses). Наблюдалось на staging: /projects (ru) после сида
// показывал свежие карточки, /en/projects — «Content coming soon» с той же таблицей и тем же
// запросом (agent-mail e2e-gate-status-form-example-kami, 2026-08-21).
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'projects' })

  return {
    title: t('title'),
    description: locale === 'ru'
      ? 'Портфолио проектов Ками: веб-приложения, дашборды и SaaS решения'
      : "Kami's project portfolio: web applications, dashboards and SaaS solutions",
    alternates: {
      canonical: `/${locale}/projects`,
      languages: { ru: '/ru/projects', en: '/en/projects' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/projects` },
  }
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const projects = await prisma.project.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      titleEn: true,
      description: true,
      descriptionEn: true,
      technologies: true,
      demoUrl: true,
      codeUrl: true,
      featured: true,
    },
  })

  const t = await getTranslations('projects')
  const tNav = await getTranslations('nav')
  const currentLocale = await getLocale()

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
              {currentLocale === 'ru' ? 'Проекты, над которыми я работал' : 'Projects I have worked on'}
            </Text>
          </VStack>

          {/* Сетка проектов */}
          {projects.length === 0 && (
            <VStack py={16} gap={4} textAlign="center">
              <Text fontSize="lg" color="fg.muted">
                {currentLocale === 'ru' ? 'Скоро здесь появится контент' : 'Content coming soon'}
              </Text>
            </VStack>
          )}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {projects.map((project) => (
              <Box
                key={project.id}
                borderRadius="xl"
                overflow="hidden"
                bg="bg.panel"
                border="1px solid"
                borderColor="border"
                _hover={{
                  borderColor: 'fg.500',
                  transform: 'translateY(-4px)',
                  boxShadow: 'xl',
                }}
                transitionProperty="border-color, transform, box-shadow"
                transitionDuration="0.3s"
                position="relative"
              >
                {/* Featured бейдж */}
                {project.featured && (
                  <Badge position="absolute" top={3} right={3} colorPalette="fg" variant="solid" zIndex={1}>
                    Featured
                  </Badge>
                )}

                {/* Плейсхолдер изображения */}
                <Box
                  h="160px"
                  bg={{
                    base: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    _dark: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
                  }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="4xl" fontWeight="bold" color="fg.contrast" opacity={0.3}>
                    {project.title.charAt(0)}
                  </Text>
                </Box>

                {/* Контент */}
                <VStack align="start" p={5} gap={3}>
                  <Heading as="h3" fontSize="lg">
                    {currentLocale === 'ru' ? project.title : project.titleEn}
                  </Heading>

                  <Text fontSize="sm" color="fg.subtle" lineClamp={2}>
                    {currentLocale === 'ru' ? project.description : project.descriptionEn}
                  </Text>

                  {/* Технологии */}
                  <HStack gap={2} flexWrap="wrap">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <Badge key={tech} variant="subtle" colorPalette="gray" size="sm">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 4 && (
                      <Badge variant="subtle" colorPalette="gray" size="sm">
                        +{project.technologies.length - 4}
                      </Badge>
                    )}
                  </HStack>

                  {/* Ссылки */}
                  <HStack gap={3} pt={2}>
                    {project.demoUrl && (
                      <Pressable display="inline-flex" borderRadius="md">
                        <Button asChild size="sm" variant="outline" colorPalette="fg">
                          <ChakraLink href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} />
                            <Text ml={1}>{t('viewDemo')}</Text>
                          </ChakraLink>
                        </Button>
                      </Pressable>
                    )}
                    {project.codeUrl && (
                      <Pressable display="inline-flex" borderRadius="md">
                        <Button asChild size="sm" variant="ghost">
                          <ChakraLink href={project.codeUrl} target="_blank" rel="noopener noreferrer">
                            <GitHubIcon width={14} height={14} />
                            <Text ml={1}>{t('viewCode')}</Text>
                          </ChakraLink>
                        </Button>
                      </Pressable>
                    )}
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>

          {/* CTA — предложение позвать на работу после просмотра портфолио */}
          <VStack gap={4} pt={8} textAlign="center">
            <Pressable display="inline-flex" borderRadius="md">
              <Button asChild size="lg" colorPalette="fg">
                <Link href="/hire/">{tNav('hire')}</Link>
              </Button>
            </Pressable>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
