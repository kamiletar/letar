import { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Link, Tabs, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuActivity, LuBookOpen, LuCalendar, LuDownload, LuNetwork, LuSparkles, LuUser } from 'react-icons/lu'
import { ClientIntegrationTab, ClientPlansTab, ClientProfilesTab, ClientSessionsTab } from '../_components'

type Params = Promise<{ id: string }>

// Форматирование пола
function formatGender(gender: Gender | null): string {
  if (!gender) {
    return 'Не указан'
  }
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    case Gender.OTHER:
      return 'Другое'
    default:
      return gender
  }
}

// Вычисление возраста
function calculateAge(birthdate: Date | null): string {
  if (!birthdate) {
    return 'Не указан'
  }
  const today = new Date()
  const birthDate = new Date(birthdate)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return `${age} лет`
}

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // Получение данных клиента
  const client = await db.client.findUnique({
    where: { id },
    include: {
      numerologyProfile: true,
      neuroPsychProfile: true,
      energyProfile: true,
      bodyProfile: true,
      styleProfile: true,
      sessions: {
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      },
      transformationPlans: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  // Если клиент не найден
  if (!client) {
    notFound()
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Хедер */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/clients">← Назад к списку клиентов</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Heading size="2xl" textTransform="none">
                {client.name}
              </Heading>
              <Text color="fg.muted">{client.email}</Text>
            </Box>
            <Link href={`/api/pdf/client/${client.id}`} target="_blank">
              <Button colorPalette="fg" size="md">
                <LuDownload />
                Экспорт профиля в PDF
              </Button>
            </Link>
          </Box>
        </Box>

        {/* Вкладки */}
        <Tabs.Root defaultValue="info" variant="enclosed">
          <Tabs.List>
            <Tabs.Trigger value="info">
              <LuUser />
              Информация
            </Tabs.Trigger>
            <Tabs.Trigger value="profiles">
              <LuSparkles />
              Профили (5 уровней)
            </Tabs.Trigger>
            <Tabs.Trigger value="integration">
              <LuNetwork />
              Интеграция
            </Tabs.Trigger>
            <Tabs.Trigger value="sessions">
              <LuCalendar />
              Сессии
            </Tabs.Trigger>
            <Tabs.Trigger value="plan">
              <LuBookOpen />
              План трансформации
            </Tabs.Trigger>
            <Tabs.Trigger value="results">
              <LuActivity />
              Результаты
            </Tabs.Trigger>
          </Tabs.List>

          {/* Вкладка: Информация */}
          <Tabs.Content value="info" py={6}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Text fontWeight="medium" mb={1}>
                  Общая информация
                </Text>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <VStack align="stretch" gap={3}>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Email
                      </Text>
                      <Text>{client.email}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Телефон
                      </Text>
                      <Text>{client.phone || 'Не указан'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Пол
                      </Text>
                      <Text>{formatGender(client.gender)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Дата рождения / Возраст
                      </Text>
                      <Text>
                        {client.birthdate
                          ? `${new Date(client.birthdate).toLocaleDateString('ru-RU')} (${calculateAge(
                              client.birthdate
                            )})`
                          : 'Не указана'}
                      </Text>
                    </Box>
                  </VStack>
                </Box>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={1}>
                  Основной запрос клиента
                </Text>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text whiteSpace="pre-wrap">{client.mainRequest || 'Не указан'}</Text>
                </Box>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={1}>
                  Заметки специалиста
                </Text>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text whiteSpace="pre-wrap">{client.notes || 'Нет заметок'}</Text>
                </Box>
              </Box>
            </VStack>
          </Tabs.Content>

          {/* Вкладка: Профили */}
          <Tabs.Content value="profiles" py={6}>
            <Text fontSize="lg" fontWeight="medium" mb={4}>
              5 уровней диагностики ИМОТ
            </Text>
            <ClientProfilesTab
              clientId={client.id}
              profiles={{
                numerology: client.numerologyProfile,
                neuroPsych: client.neuroPsychProfile,
                energy: client.energyProfile,
                body: client.bodyProfile,
                style: client.styleProfile,
              }}
            />
          </Tabs.Content>

          {/* Вкладка: Интеграция */}
          <Tabs.Content value="integration" py={6}>
            <ClientIntegrationTab
              profiles={{
                numerology: client.numerologyProfile,
                neuroPsych: client.neuroPsychProfile,
                energy: client.energyProfile,
                body: client.bodyProfile,
                style: client.styleProfile,
              }}
            />
          </Tabs.Content>

          {/* Вкладка: Сессии */}
          <Tabs.Content value="sessions" py={6}>
            <ClientSessionsTab clientId={client.id} sessions={client.sessions} />
          </Tabs.Content>

          {/* Вкладка: План трансформации */}
          <Tabs.Content value="plan" py={6}>
            <ClientPlansTab clientId={client.id} plans={client.transformationPlans} />
          </Tabs.Content>

          {/* Вкладка: Результаты */}
          <Tabs.Content value="results" py={6}>
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={4}>
                Результаты и прогресс
              </Text>
              <Text color="fg.muted">Раздел в разработке</Text>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Container>
  )
}
