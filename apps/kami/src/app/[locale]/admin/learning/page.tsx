import { OptimizedImage } from '@/app/_components/ui/optimized-image'
import type { LearningItemType } from '@/generated/prisma'
import { LearningItemTypeLabels, LearningStatusColors, LearningStatusLabels } from '@/kami-form'
import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { Book, BookOpen, GraduationCap, Headphones, Mic, MonitorPlay, Newspaper } from 'lucide-react'
import { AdminPageLayout, AdminTableActions, PublishStatusBadge, RatingStars } from '../_components'

interface LearningAdminPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/** Иконки для типов материалов */
const typeIcons: Record<LearningItemType, React.ReactNode> = {
  BOOK: <Book size={16} />,
  COURSE: <GraduationCap size={16} />,
  ARTICLE: <Newspaper size={16} />,
  VIDEO: <MonitorPlay size={16} />,
  PODCAST: <Headphones size={16} />,
  CONFERENCE: <Mic size={16} />,
  OTHER: <BookOpen size={16} />,
}

/**
 * Управление списками изучения
 */
export default async function LearningAdminPage({ params, searchParams }: LearningAdminPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Параллельные запросы: данные + count
  const [items, total] = await Promise.all([
    prisma.learningItem.findMany({
      orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        author: true,
        coverImage: true,
        type: true,
        status: true,
        rating: true,
        isPublished: true,
        isFeatured: true,
      },
    }),
    prisma.learningItem.count(),
  ])

  return (
    <AdminPageLayout
      title="Изучаю"
      total={total}
      basePath={`/${locale}/admin/learning`}
      addPath={`/${locale}/admin/learning/new`}
      emptyText="Элементов пока нет"
      isEmpty={items.length === 0}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Тип</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>Рейтинг</Table.ColumnHeader>
              <Table.ColumnHeader>Публикация</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <HStack gap={3}>
                    {item.coverImage && (
                      <OptimizedImage src={item.coverImage} alt={item.title} boxSize="40px" borderRadius="md" />
                    )}
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium" lineClamp={1}>
                        {item.title}
                      </Text>
                      {item.author && (
                        <Text fontSize="sm" color="fg.muted">
                          {item.author}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Icon boxSize={4} color="fg.muted">
                      {typeIcons[item.type]}
                    </Icon>
                    <Text fontSize="sm">{LearningItemTypeLabels[item.type]}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette={LearningStatusColors[item.status]}>
                    {LearningStatusLabels[item.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {item.rating ? <RatingStars rating={item.rating} /> : <Text color="fg.muted">—</Text>}
                </Table.Cell>
                <Table.Cell>
                  <PublishStatusBadge isPublished={item.isPublished} isFeatured={item.isFeatured} />
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/learning/${item.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
