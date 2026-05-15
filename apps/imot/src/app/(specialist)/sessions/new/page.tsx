import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'
import { SessionForm } from '../_components/session-form'
import { createSession } from './_actions/create-session'

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId: preselectedClientId } = await searchParams
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

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

  // Если нет клиентов, показываем сообщение
  if (clients.length === 0) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={8} align="stretch">
          <Box>
            <Link asChild color="fg.muted" fontSize="sm" mb={2}>
              <NextLink href="/sessions">← Назад к сессиям</NextLink>
            </Link>
            <Heading size="2xl" textTransform="none">
              Запланировать сессию
            </Heading>
          </Box>
          <Box p={6} bg="yellow.subtle" borderWidth="1px" borderColor="yellow.solid" borderRadius="md">
            <Heading size="md" mb={2}>
              У вас пока нет клиентов
            </Heading>
            <p>
              Для планирования сессии необходимо сначала добавить клиента.{' '}
              <Link asChild color="fg" fontWeight="medium">
                <NextLink href="/clients/new">Добавить клиента</NextLink>
              </Link>
            </p>
          </Box>
        </VStack>
      </Container>
    )
  }

  // Получаем текущую дату и время в формате для datetime-local input
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()) // Корректируем timezone
  const defaultDateTime = now.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/sessions">← Назад к сессиям</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Запланировать сессию
          </Heading>
        </Box>

        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <SessionForm
            onSubmit={createSession}
            clients={clients}
            defaultValue={{
              clientId: preselectedClientId,
              scheduledAt: defaultDateTime,
              duration: 60,
              status: 'SCHEDULED',
            }}
            submitLabel="Запланировать"
          />
        </Box>
      </VStack>
    </Container>
  )
}
