import type { LearningItemType, LearningStatus } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { Box, Container, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Book, BookOpen, GraduationCap, Headphones, Mic, MonitorPlay, Newspaper } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { LearningCard, StatBadge } from './_components'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ type?: string; status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('learning')
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: {
      canonical: `/${locale}/learning`,
      languages: { ru: '/ru/learning', en: '/en/learning' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/learning` },
  }
}

/** Иконки для типов материалов */
const typeIcons: Record<LearningItemType, React.ReactNode> = {
  BOOK: <Book />,
  COURSE: <GraduationCap />,
  ARTICLE: <Newspaper />,
  VIDEO: <MonitorPlay />,
  PODCAST: <Headphones />,
  CONFERENCE: <Mic />,
  OTHER: <BookOpen />,
}

/**
 * Страница списков прочитанного/изученного
 */
export default async function LearningPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { type, status } = await searchParams
  setRequestLocale(locale)

  const currentLocale = await getLocale()
  const t = await getTranslations('learning')

  // Фильтрация
  const whereClause: Record<string, unknown> = {
    isPublished: true,
  }
  if (type) {
    whereClause.type = type
  }
  if (status) {
    whereClause.status = status
  }

  const items = await prisma.learningItem.findMany({
    where: whereClause,
    orderBy: [{ isFeatured: 'desc' }, { completedAt: 'desc' }, { order: 'asc' }],
  })

  // Группировка по статусу
  const groupedItems = {
    COMPLETED: items.filter((i) => i.status === 'COMPLETED'),
    IN_PROGRESS: items.filter((i) => i.status === 'IN_PROGRESS'),
    WANT_TO_LEARN: items.filter((i) => i.status === 'WANT_TO_LEARN'),
  }

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="6xl">
        <VStack gap={12} align="stretch">
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h1" fontSize={{ base: '3xl', md: '5xl' }} fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize="lg" color="fg.muted" maxW="2xl">
              {t('subtitle')}
            </Text>
          </VStack>

          {/* Статистика */}
          <HStack gap={6} justify="center" flexWrap="wrap">
            <StatBadge label={t('stats.completed')} value={groupedItems.COMPLETED.length} colorPalette="green" />
            <StatBadge label={t('stats.inProgress')} value={groupedItems.IN_PROGRESS.length} colorPalette="blue" />
            <StatBadge label={t('stats.wantToLearn')} value={groupedItems.WANT_TO_LEARN.length} colorPalette="purple" />
          </HStack>

          {/* Изучаю сейчас */}
          {groupedItems.IN_PROGRESS.length > 0 && (
            <LearningSection
              title={t('sections.inProgress')}
              items={groupedItems.IN_PROGRESS}
              locale={currentLocale}
              t={t}
            />
          )}

          {/* Изучено */}
          {groupedItems.COMPLETED.length > 0 && (
            <LearningSection
              title={t('sections.completed')}
              items={groupedItems.COMPLETED}
              locale={currentLocale}
              t={t}
            />
          )}

          {/* Хочу изучить */}
          {groupedItems.WANT_TO_LEARN.length > 0 && (
            <LearningSection
              title={t('sections.wantToLearn')}
              items={groupedItems.WANT_TO_LEARN}
              locale={currentLocale}
              t={t}
            />
          )}

          {/* Пусто */}
          {items.length === 0 && (
            <Text textAlign="center" color="fg.muted" py={12}>
              {t('empty')}
            </Text>
          )}
        </VStack>
      </Container>
    </Box>
  )
}

/** Секция с элементами по статусу */
interface LearningSectionProps {
  title: string
  items: Array<{
    id: string
    title: string
    titleEn: string | null
    author: string | null
    url: string | null
    coverImage: string | null
    type: LearningItemType
    category: string | null
    tags: string[]
    status: LearningStatus
    rating: number | null
    notes: string | null
    notesEn: string | null
    completedAt: Date | null
    year: number | null
    isFeatured: boolean
  }>
  locale: string
  t: (key: string) => string
}

function LearningSection({ title, items, locale, t }: LearningSectionProps) {
  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">{title}</Heading>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
        {items.map((item) => (
          <LearningCard key={item.id} item={item} locale={locale} typeIcon={typeIcons[item.type]} t={t} />
        ))}
      </Grid>
    </VStack>
  )
}
