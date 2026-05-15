import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { getStudentInstructors } from './_actions/schedule.action'
import { InstructorSlotsCard } from './_components/instructor-slots-card'

export const metadata = {
  title: 'Расписание',
  description: 'Запись на занятие к инструктору',
}

export default async function SchedulePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-schedule')
  }

  // Проверяем наличие профиля ученика
  if (!session.user.hasStudentProfile) {
    redirect('/dashboard')
  }

  const result = await getStudentInstructors()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              Не удалось загрузить расписание
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Расписание</Heading>
          <Text color="fg.muted" mt={2}>
            Выберите удобное время для занятия
          </Text>
        </Box>

        {/* Список инструкторов со слотами */}
        {result.instructors.length > 0 ? (
          result.instructors.map((instructor) => (
            <InstructorSlotsCard key={instructor.id} instructor={instructor} studentLicenses={result.studentLicenses} />
          ))
        ) : (
          <Box bg="bg.muted" p={8} borderRadius="lg" textAlign="center">
            <Heading size="md" color="fg.muted" mb={2}>
              Нет доступных инструкторов
            </Heading>
            <Text color="fg.muted">Примите приглашение от инструктора, чтобы записываться на занятия</Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
