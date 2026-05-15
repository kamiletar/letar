import { signOutAction } from '@/app/_actions/auth.actions'
import { UserAvatar } from '@/app/_components/user-avatar'
import { requireAuth } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Card, Container, Heading, HStack, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { RiEdit2Line, RiLogoutBoxLine, RiShieldUserLine } from 'react-icons/ri'
import { NotificationSettingsForm } from './_components/notification-settings-form'

export default async function ProfilePage() {
  const user = await requireAuth()
  const db = getEnhancedPrisma(user)

  // Получаем настройки уведомлений пользователя
  const userWithSettings = await db.user.findUnique({
    where: { id: user.id },
    select: {
      emailNotifications: true,
      notifySessionReminders: true,
      notifyNewPractices: true,
      notifyPracticeDiary: true,
    },
  })

  // Определяем цвет бейджа роли
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'red'
      case 'SPECIALIST':
        return 'purple'
      case 'CLIENT':
        return 'blue'
      default:
        return 'gray'
    }
  }

  // Определяем название роли на русском
  const getRoleName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Администратор'
      case 'SPECIALIST':
        return 'Специалист'
      case 'CLIENT':
        return 'Клиент'
      default:
        return role
    }
  }

  return (
    <Container maxW="4xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Heading size="xl" color="fg">
          Профиль
        </Heading>

        {/* Основная карточка профиля */}
        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <HStack gap={4}>
                {/* Аватар */}
                <UserAvatar name={user.name} image={user.image} size="2xl" />

                {/* Имя и роль */}
                <VStack align="start" gap={1}>
                  <Heading size="lg">{user.name || 'Пользователь'}</Heading>
                  <Badge colorPalette={getRoleColor(user.role)} size="sm">
                    <RiShieldUserLine />
                    {getRoleName(user.role)}
                  </Badge>
                </VStack>
              </HStack>

              {/* Кнопка редактирования */}
              <Link href="/profile/edit">
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

              {/* ID пользователя */}
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>
                  ID пользователя
                </Text>
                <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                  {user.id}
                </Text>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Информация о роли */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Права доступа</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              {user.role === 'CLIENT' && (
                <>
                  <Text fontSize="sm">Вам доступны следующие разделы:</Text>
                  <Stack gap={2} pl={4}>
                    <Text fontSize="sm">• Моя диагностика</Text>
                    <Text fontSize="sm">• План трансформации</Text>
                    <Text fontSize="sm">• Практики</Text>
                    <Text fontSize="sm">• Прогресс</Text>
                  </Stack>
                </>
              )}

              {user.role === 'SPECIALIST' && (
                <>
                  <Text fontSize="sm">Вам доступны следующие разделы:</Text>
                  <Stack gap={2} pl={4}>
                    <Text fontSize="sm">• Клиенты</Text>
                    <Text fontSize="sm">• Сессии</Text>
                    <Text fontSize="sm">• Аналитика</Text>
                  </Stack>
                </>
              )}

              {user.role === 'ADMIN' && (
                <>
                  <Text fontSize="sm">Вам доступны следующие разделы:</Text>
                  <Stack gap={2} pl={4}>
                    <Text fontSize="sm">• Управление пользователями</Text>
                    <Text fontSize="sm">• Управление специалистами</Text>
                    <Text fontSize="sm">• Настройки системы</Text>
                    <Text fontSize="sm">• Все разделы специалиста и клиента</Text>
                  </Stack>
                </>
              )}
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
