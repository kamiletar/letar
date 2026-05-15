import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SessionForm } from '../../_components/session-form'
import { updateSession } from './_actions/update-session'

type Params = Promise<{ id: string }>

export default async function EditSessionPage({ params }: { params: Params }) {
  const { id } = await params
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение данных сессии
  const therapySession = await db.therapySession.findUnique({
    where: { id },
    include: {
      client: true,
    },
  })

  // Если сессия не найдена
  if (!therapySession) {
    notFound()
  }

  // Получение списка клиентов для выбора
  const clients = await db.client.findMany({
    where: {
      specialistId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Форматирование даты для datetime-local input
  const scheduledDate = new Date(therapySession.scheduledAt)
  scheduledDate.setMinutes(scheduledDate.getMinutes() - scheduledDate.getTimezoneOffset())
  const formattedDate = scheduledDate.toISOString().slice(0, 16)

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href={`/sessions/${id}`}>← Назад к сессии</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Редактировать сессию
          </Heading>
        </Box>

        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <SessionForm
            onSubmit={updateSession.bind(null, id)}
            clients={clients}
            defaultValue={{
              clientId: therapySession.clientId,
              scheduledAt: formattedDate,
              duration: therapySession.duration,
              status: therapySession.status,
              topic: therapySession.topic || undefined,
              notes: therapySession.notes || undefined,
              homework: therapySession.homework || undefined,
            }}
            submitLabel="Обновить"
          />
        </Box>
      </VStack>
    </Container>
  )
}
