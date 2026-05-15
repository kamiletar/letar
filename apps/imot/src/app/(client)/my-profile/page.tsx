import { NotificationSettingsForm } from '@/app/(dashboard)/profile/_components/notification-settings-form'
import { signOutAction } from '@/app/_actions/auth.actions'
import { UserAvatar } from '@/app/_components/user-avatar'
import { requireAuth, requireClientProfile } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { Badge, Box, Button, Card, Container, Heading, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { RiEdit2Line, RiLogoutBoxLine, RiShieldUserLine, RiUserHeartLine } from 'react-icons/ri'

export default async function MyProfilePage() {
  const user = await requireAuth()

  // Требуем заполненный профиль клиента
  await requireClientProfile(user.id)

  // Получаем настройки уведомлений и данные клиента
  const [userWithSettings, clientProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        phoneNumber: true,
        emailNotifications: true,
        notifySessionReminders: true,
        notifyNewPractices: true,
        notifyPracticeDiary: true,
      },
    }),
    prisma.client.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        birthdate: true,
        photo: true,
        mainRequest: true,
        specialist: {
          select: {
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    }),
  ])

  return (
    <Container maxW="4xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Heading size="xl" color="fg">
          Мой профиль
        </Heading>

        {/* Основная карточка профиля */}
        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <HStack gap={4}>
                {/* Аватар */}
                <UserAvatar
                  name={user.name || clientProfile?.name}
                  image={user.image || clientProfile?.photo}
                  size="2xl"
                />

                {/* Имя и роль */}
                <VStack align="start" gap={1}>
                  <Heading size="lg">{user.name || clientProfile?.name || 'Пользователь'}</Heading>
                  <Badge colorPalette="blue" size="sm">
                    <RiShieldUserLine />
                    Клиент
                  </Badge>
                </VStack>
              </HStack>

              {/* Кнопка редактирования */}
              <Link href="/my-profile/edit">
                <Button variant="outline" size="sm">
                  <RiEdit2Line />
                  Редактировать
                </Button>
              </Link>
            </HStack>
          </Card.Header>

          <Card.Body>
            <Stack gap={4}>
              {/* Email */}
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>
                  Email
                </Text>
                <Text fontSize="md" fontWeight="medium">
                  {user.email}
                </Text>
              </Box>

              {/* Телефон */}
              {(userWithSettings?.phoneNumber || clientProfile?.phone) && (
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Телефон
                  </Text>
                  <Text fontSize="md" fontWeight="medium">
                    {userWithSettings?.phoneNumber || clientProfile?.phone}
                  </Text>
                </Box>
              )}

              {/* Пол */}
              {clientProfile?.gender && (
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Пол
                  </Text>
                  <Text fontSize="md" fontWeight="medium">
                    {clientProfile.gender === 'MALE'
                      ? 'Мужской'
                      : clientProfile.gender === 'FEMALE'
                        ? 'Женский'
                        : 'Другой'}
                  </Text>
                </Box>
              )}

              {/* Дата рождения */}
              {clientProfile?.birthdate && (
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Дата рождения
                  </Text>
                  <Text fontSize="md" fontWeight="medium">
                    {new Date(clientProfile.birthdate).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </Box>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Специалист */}
        {clientProfile?.specialist && (
          <Card.Root>
            <Card.Header>
              <HStack gap={2}>
                <RiUserHeartLine size={20} />
                <Heading size="md">Мой специалист</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Имя специалиста
                  </Text>
                  <Text fontSize="md" fontWeight="medium">
                    {clientProfile.specialist.name || 'Не указано'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Email специалиста
                  </Text>
                  <Text fontSize="md" fontWeight="medium">
                    {clientProfile.specialist.email}
                  </Text>
                </Box>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Основной запрос */}
        {clientProfile?.mainRequest && (
          <Card.Root>
            <Card.Header>
              <Heading size="md">Мой запрос</Heading>
            </Card.Header>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                {clientProfile.mainRequest}
              </Text>
            </Card.Body>
          </Card.Root>
        )}

        {/* Доступные разделы */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Доступные разделы</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Text fontSize="sm">Вам доступны следующие разделы:</Text>
              <Stack gap={2} pl={4}>
                <Text fontSize="sm">• Моя диагностика - просмотр результатов диагностики по 5 уровням</Text>
                <Text fontSize="sm">• План трансформации - индивидуальный план развития</Text>
                <Text fontSize="sm">• Практики - упражнения и техники для работы</Text>
                <Text fontSize="sm">• Сессии - расписание встреч со специалистом</Text>
                <Text fontSize="sm">• Прогресс - отслеживание изменений и результатов</Text>
              </Stack>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Настройки уведомлений */}
        {userWithSettings && (
          <NotificationSettingsForm
            initialValues={{
              emailNotifications: userWithSettings.emailNotifications,
              notifySessionReminders: userWithSettings.notifySessionReminders,
              notifyNewPractices: userWithSettings.notifyNewPractices,
              notifyPracticeDiary: userWithSettings.notifyPracticeDiary,
            }}
          />
        )}

        {/* Действия */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Действия</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <form action={signOutAction}>
                <Button type="submit" colorPalette="red" variant="outline" width="full" size="md">
                  <RiLogoutBoxLine />
                  Выйти из аккаунта
                </Button>
              </form>
            </Stack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
