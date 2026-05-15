import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, Table, Text } from '@chakra-ui/react'
import { AdminPageLayout, AdminTableActions } from '../../_components'

interface SkillCategoriesPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Управление категориями навыков
 */
export default async function SkillCategoriesPage({ params, searchParams }: SkillCategoriesPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Параллельные запросы: данные + count
  const [categories, total] = await Promise.all([
    prisma.skillCategory.findMany({
      orderBy: { order: 'asc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        icon: true,
        order: true,
        _count: {
          select: { skills: true },
        },
      },
    }),
    prisma.skillCategory.count(),
  ])

  return (
    <AdminPageLayout
      title="Категории навыков"
      total={total}
      basePath={`/${locale}/admin/skills/categories`}
      addPath={`/${locale}/admin/skills/categories/new`}
      emptyText="Категорий пока нет"
      isEmpty={categories.length === 0}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Slug</Table.ColumnHeader>
              <Table.ColumnHeader>Иконка</Table.ColumnHeader>
              <Table.ColumnHeader>Навыков</Table.ColumnHeader>
              <Table.ColumnHeader>Порядок</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {categories.map((category) => (
              <Table.Row key={category.id}>
                <Table.Cell>
                  <Text fontWeight="medium">{category.name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {category.nameEn}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text color="fg.muted" fontFamily="mono" fontSize="sm">
                    {category.slug}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {category.icon ? (
                    <Badge variant="subtle" colorPalette="gray">
                      {category.icon}
                    </Badge>
                  ) : (
                    <Text color="fg.muted">—</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette="purple">
                    {category._count.skills}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text>{category.order}</Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/skills/categories/${category.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
