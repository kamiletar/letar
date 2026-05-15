import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuPlus } from 'react-icons/lu'
import { getStudentsWithBalances } from './[id]/balance/_actions/balance.action'
import { StudentCard } from './_components/student-card'

export const metadata = {
  title: 'Мои ученики',
  description: 'Список учеников инструктора',
}

export default async function StudentsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/students')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getStudentsWithBalances()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              Не удалось загрузить список учеников
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  // Группировка по статусу
  const activeStudents = result.students.filter((s) => s.status === 'ACTIVE')
  const pausedStudents = result.students.filter((s) => s.status === 'PAUSED')
  const disconnectedStudents = result.students.filter((s) => s.status === 'DISCONNECTED')

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        {/* Заголовок */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Мои ученики</Heading>
            <Text color="fg.muted" mt={2}>
              Всего учеников: {result.students.length}
            </Text>
          </Box>
          <Button asChild colorPalette="brand">
            <Link href="/students/invite">
              <LuPlus size={16} />
              Пригласить ученика
            </Link>
          </Button>
        </HStack>

        {/* Активные ученики */}
        {activeStudents.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Активные ({activeStudents.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {activeStudents.map((student) => (
                <StudentCard key={student.studentUserId} student={student} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Приостановленные ученики */}
        {pausedStudents.length > 0 && (
          <Box>
            <Heading size="md" mb={4} color="fg.muted">
              Приостановленные ({pausedStudents.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {pausedStudents.map((student) => (
                <StudentCard key={student.studentUserId} student={student} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Отключённые ученики */}
        {disconnectedStudents.length > 0 && (
          <Box>
            <Heading size="md" mb={4} color="fg.muted">
              Отключённые ({disconnectedStudents.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {disconnectedStudents.map((student) => (
                <StudentCard key={student.studentUserId} student={student} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Пустое состояние */}
        {result.students.length === 0 && (
          <Box bg="bg.muted" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={4}>
              У вас пока нет учеников
            </Text>
            <Button asChild colorPalette="brand">
              <Link href="/students/invite">
                <LuPlus size={16} />
                Пригласить первого ученика
              </Link>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
