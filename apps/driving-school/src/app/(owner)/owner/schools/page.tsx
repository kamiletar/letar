import { Box, Card, Heading, HStack, Text } from '@chakra-ui/react'

import { getOrganizationsAction } from './_actions/schools.action'
import { SchoolTable } from './_components/school-table'
import { StatBadge } from './_components/stat-badge'

export default async function OwnerSchoolsPage() {
  // Загружаем организации через Server Action
  const result = await getOrganizationsAction()

  // Ошибка
  if (!result.success) {
    return (
      <Card.Root>
        <Card.Body>
          <Text color="fg.error">Ошибка загрузки данных</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const organizationsWithStats = result.data

  // Вычисляем общую статистику
  const totalOrganizations = organizationsWithStats.length
  const publicOrganizations = organizationsWithStats.filter((s) => s.isPublic).length
  const privateOrganizations = totalOrganizations - publicOrganizations
  const totalStudents = organizationsWithStats.reduce((acc, s) => acc + s.students, 0)
  const totalInstructors = organizationsWithStats.reduce((acc, s) => acc + s.instructors, 0)

  return (
    <>
      {/* Заголовок */}
      <Box>
        <Heading size="xl">Управление автошколами</Heading>
        <Text color="fg.muted" mt={2}>
          Модерация и статистика автошкол на платформе
        </Text>
      </Box>

      {/* Статистика */}
      <HStack gap={4} wrap="wrap">
        <StatBadge iconName="building" label="Всего школ" value={totalOrganizations} color="blue" />
        <StatBadge iconName="check" label="Опубликованных" value={publicOrganizations} color="green" />
        <StatBadge iconName="eye" label="Неопубликованных" value={privateOrganizations} color="orange" />
        <StatBadge iconName="users" label="Всего учеников" value={totalStudents} color="purple" />
        <StatBadge iconName="users" label="Всего инструкторов" value={totalInstructors} color="cyan" />
      </HStack>

      {/* Таблица школ */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Список автошкол</Heading>
        </Card.Header>
        <Card.Body p={0}>
          <SchoolTable schools={organizationsWithStats} />
        </Card.Body>
      </Card.Root>
    </>
  )
}
