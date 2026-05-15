import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuPlus } from 'react-icons/lu'
import { getLessonTypes } from './_actions/lesson-type.action'
import { LessonTypeCard } from './_components/lesson-type-card'

export const metadata = {
  title: 'Типы занятий',
  description: 'Управление типами занятий и ценами',
}

export default async function LessonTypesPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lesson-types')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getLessonTypes()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              {result.error === 'NO_PROFILE'
                ? 'Необходимо заполнить профиль инструктора'
                : 'Не удалось загрузить типы занятий'}
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  const activeTypes = result.lessonTypes.filter((t) => t.isActive)
  const archivedTypes = result.lessonTypes.filter((t) => !t.isActive)

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Типы занятий</Heading>
            <Text color="fg.muted" mt={2}>
              Управление видами занятий и ценами
            </Text>
          </Box>
          <Button asChild colorPalette="brand" size="lg">
            <Link href="/lesson-types/new">
              <LuPlus />
              Добавить тип
            </Link>
          </Button>
        </Box>

        {/* Активные типы */}
        {activeTypes.length > 0 ? (
          <Box>
            <Heading size="md" mb={4}>
              Активные типы ({activeTypes.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {activeTypes.map((lessonType) => (
                <LessonTypeCard key={lessonType.id} lessonType={lessonType} />
              ))}
            </SimpleGrid>
          </Box>
        ) : (
          <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={4}>
              У вас пока нет типов занятий
            </Text>
            <Text color="fg.muted" fontSize="sm">
              Создайте типы занятий, чтобы ученики могли выбирать их при записи
            </Text>
          </Box>
        )}

        {/* Архивные типы */}
        {archivedTypes.length > 0 && (
          <Box>
            <Heading size="md" mb={4} color="fg.muted">
              Архив ({archivedTypes.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {archivedTypes.map((lessonType) => (
                <LessonTypeCard key={lessonType.id} lessonType={lessonType} isArchived />
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
