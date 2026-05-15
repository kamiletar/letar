import { ClientProfileEditForm } from '@/app/_components/client-profile-edit-form'
import type { ClientProfileEditData } from '@/app/_schemas/client-profile.schema'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { Box, Button, Card, Container, Heading, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { RiArrowLeftLine } from 'react-icons/ri'

export default async function MyProfileEditPage() {
  const sessionUser = await requireAuth()

  // Получаем полный объект User и Client из БД
  const [user, clientProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        image: true,
        role: true,
      },
    }),
    prisma.client.findUnique({
      where: { userId: sessionUser.id },
      select: {
        id: true,
        name: true,
        phone: true,
        gender: true,
        birthdate: true,
        photo: true,
      },
    }),
  ])

  if (!user) {
    throw new Error('Пользователь не найден')
  }

  // Форматируем данные для формы
  const defaultValue: ClientProfileEditData = {
    name: user.name || clientProfile?.name || '',
    phoneNumber: user.phoneNumber || '',
    image: user.image || clientProfile?.photo || '',
    gender: clientProfile?.gender ?? '',
    birthdate: clientProfile?.birthdate ? clientProfile.birthdate.toISOString().split('T')[0] : '',
    phone: clientProfile?.phone || '',
  }

  return (
    <Container maxW="2xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Заголовок с кнопкой назад */}
        <HStack justify="space-between">
          <Heading size="xl" color="fg">
            Редактирование профиля
          </Heading>
          <Link href="/my-profile">
            <Button variant="outline" size="sm">
              <RiArrowLeftLine />
              Назад
            </Button>
          </Link>
        </HStack>

        {/* Форма редактирования */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Основная информация</Heading>
          </Card.Header>
          <Card.Body>
            <ClientProfileEditForm defaultValue={defaultValue} />
          </Card.Body>
        </Card.Root>

        {/* Информационный блок */}
        <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <HStack gap={2}>
            <Box fontSize="lg">ℹ️</Box>
            <Box>
              <Box fontSize="sm" color="fg.muted">
                Email и роль изменить нельзя. Для изменения email обратитесь к администратору.
              </Box>
              <Box fontSize="sm" color="fg.muted" mt={2}>
                Дата рождения используется для расчета Матрицы Судьбы в нумерологическом профиле.
              </Box>
            </Box>
          </HStack>
        </Box>
      </VStack>
    </Container>
  )
}
