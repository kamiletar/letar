import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Badge, Box, HStack, Table, Text } from '@chakra-ui/react'
import { AdminPageLayout, AdminTableActions } from '../_components'

interface ProjectsAdminPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Управление проектами
 */
export default async function ProjectsAdminPage({ params, searchParams }: ProjectsAdminPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      orderBy: { order: 'asc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        technologies: true,
        featured: true,
        demoUrl: true,
        order: true,
      },
    }),
    prisma.project.count(),
  ])

  return (
    <AdminPageLayout
      title="Проекты"
      total={total}
      basePath={`/${locale}/admin/projects`}
      addPath={`/${locale}/admin/projects/new`}
      emptyText="Проектов пока нет"
      isEmpty={projects.length === 0}
    >
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Название</Table.ColumnHeader>
              <Table.ColumnHeader>Технологии</Table.ColumnHeader>
              <Table.ColumnHeader>Demo</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {projects.map((project) => (
              <Table.Row key={project.id}>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="medium">{project.title}</Text>
                    {project.featured && (
                      <Badge variant="subtle" colorPalette="yellow" size="sm">
                        ★
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1} flexWrap="wrap">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <Badge key={tech} variant="subtle" colorPalette="gray" size="sm">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Text color="fg.muted" fontSize="xs">
                        +{project.technologies.length - 3}
                      </Text>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  {project.demoUrl
                    ? (
                      <Text fontSize="sm" color="fg.muted" truncate maxW="200px">
                        {project.demoUrl.replace('https://', '')}
                      </Text>
                    )
                    : <Text color="fg.muted">—</Text>}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <AdminTableActions editPath={`/${locale}/admin/projects/${project.id}`} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </AdminPageLayout>
  )
}
