import { SkillLevelLabels } from '@/kami-form'
import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, Button, HStack, Icon, Table, Text } from '@chakra-ui/react'
import { Folder } from 'lucide-react'
import Link from 'next/link'
import { AdminPageLayout, AdminTableActions } from '../_components'

interface SkillsAdminPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/** Цвета для уровней навыков */
const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'gray',
  INTERMEDIATE: 'blue',
  ADVANCED: 'purple',
  EXPERT: 'green',
}

/** Вычисляет количество лет опыта */
function getYearsOfExperience(skill: { years: number | null; startYear: number | null }): number | null {
  if (skill.startYear) {
    const currentYear = new Date().getFullYear()
    return Math.max(0, currentYear - skill.startYear)
  }
  return skill.years
}

/**
 * Управление навыками
 */
export default async function SkillsAdminPage({ params, searchParams }: SkillsAdminPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  // Параллельные запросы: данные + count
  const [skills, total] = await Promise.all([
    prisma.skill.findMany({
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        years: true,
        startYear: true,
        featured: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.skill.count(),
  ])

  return (
    <AdminPageLayout
      title="Навыки"
      total={total}
      basePath={`/${locale}/admin/skills`}
      addPath={`/${locale}/admin/skills/new`}
      emptyText="Навыков пока нет"
      isEmpty={skills.length === 0}
      headerExtra={
        <HStack>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/admin/skills/categories`}>
              <Icon>
                <Folder />
              </Icon>
              Категории
            </Link>
          </Button>
        </HStack>
      }
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Категория</Table.ColumnHeader>
              <Table.ColumnHeader>Уровень</Table.ColumnHeader>
              <Table.ColumnHeader>Опыт</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {skills.map((skill) => (
              <Table.Row key={skill.id}>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="medium">{skill.name}</Text>
                    {skill.featured && (
                      <Badge variant="subtle" colorPalette="yellow" size="sm">
                        ★
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <Text color="fg.muted">{skill.category.name}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" colorPalette={LEVEL_COLORS[skill.level]}>
                    {SkillLevelLabels[skill.level]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {(() => {
                    const years = getYearsOfExperience(skill)
                    if (!years) {
                      return <Text color="fg.muted">—</Text>
                    }
                    return (
                      <HStack gap={1}>
                        <Text>{years} лет</Text>
                        {skill.startYear && (
                          <Text color="fg.muted" fontSize="xs">
                            (с {skill.startYear})
                          </Text>
                        )}
                      </HStack>
                    )
                  })()}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/skills/${skill.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
