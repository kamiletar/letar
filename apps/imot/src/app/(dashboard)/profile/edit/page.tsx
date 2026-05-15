import { ProfileEditForm } from '@/app/_components/profile-edit-form'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { Box, Button, Card, Container, Heading, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { RiArrowLeftLine } from 'react-icons/ri'

export default async function ProfileEditPage() {
  const sessionUser = await requireAuth()

  // Получаем полный объект User из БД
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      image: true,
      role: true,
    },
  })

  if (!user) {
    throw new Error('Пользователь не найден')
  }

  return (
    <Container maxW="2xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Заголовок с кнопкой назад */}
        <HStack justify="space-between">
          <Heading size="xl" color="fg">
            Редактирование профиля
          </Heading>
          <Link href="/profile">
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
            <ProfileEditForm
              defaultValues={{
                name: user.name || '',
                phoneNumber: user.phoneNumber,
                image: user.image,
              }}
            />
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
            </Box>
          </HStack>
        </Box>
      </VStack>
    </Container>
  )
}
