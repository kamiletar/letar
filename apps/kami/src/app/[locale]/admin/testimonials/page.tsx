import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE, SERVICE_TYPE_LABELS } from '@/lib/utils/constants'
import { Badge, Box, Table, Text, VStack } from '@chakra-ui/react'
import { AdminPageLayout, AdminTableActions, PublishStatusBadge, RatingStars } from '../_components'

interface TestimonialsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Управление отзывами
 */
export default async function TestimonialsPage({ params, searchParams }: TestimonialsPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Параллельные запросы: данные + count
  const [testimonials, total] = await Promise.all([
    prisma.testimonial.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        authorName: true,
        authorRole: true,
        authorCompany: true,
        content: true,
        serviceType: true,
        rating: true,
        isPublished: true,
        isFeatured: true,
      },
    }),
    prisma.testimonial.count(),
  ])

  return (
    <AdminPageLayout
      title="Отзывы"
      total={total}
      basePath={`/${locale}/admin/testimonials`}
      addPath={`/${locale}/admin/testimonials/new`}
      emptyText="Отзывов пока нет"
      isEmpty={testimonials.length === 0}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Автор</Table.ColumnHeader>
              <Table.ColumnHeader>Отзыв</Table.ColumnHeader>
              <Table.ColumnHeader>Рейтинг</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {testimonials.map((testimonial) => (
              <Table.Row key={testimonial.id}>
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{testimonial.authorName}</Text>
                    {testimonial.authorRole && (
                      <Text fontSize="sm" color="fg.muted">
                        {testimonial.authorRole}
                      </Text>
                    )}
                    {testimonial.authorCompany && (
                      <Text fontSize="sm" color="fg.muted">
                        {testimonial.authorCompany}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell maxW="300px">
                  <VStack align="start" gap={1}>
                    <Text lineClamp={2}>{testimonial.content}</Text>
                    {testimonial.serviceType && (
                      <Badge variant="subtle" colorPalette="gray" size="sm">
                        {SERVICE_TYPE_LABELS[testimonial.serviceType] || testimonial.serviceType}
                      </Badge>
                    )}
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <RatingStars rating={testimonial.rating} />
                </Table.Cell>
                <Table.Cell>
                  <PublishStatusBadge isPublished={testimonial.isPublished} isFeatured={testimonial.isFeatured} />
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/testimonials/${testimonial.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
