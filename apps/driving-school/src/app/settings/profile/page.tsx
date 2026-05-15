import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFileUrl } from '@/lib/images'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'
import { ProfileForm } from './_components/profile-form'

export const metadata = {
  title: 'Профиль',
  description: 'Настройки профиля пользователя',
}

export default async function ProfileSettingsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      avatar: { select: { path: true } },
      emailVerified: true,
    },
  })

  if (!user) {
    redirect('/sign-in')
  }

  // Приоритет: загруженный аватар > OAuth аватар
  const avatarUrl = user.avatar ? getFileUrl(user.avatar.path) : user.image

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Box>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">
              <LuArrowLeft />
              Назад к настройкам
            </Link>
          </Button>
        </Box>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Профиль</Heading>
          <Text color="fg.muted" mt={2}>
            Ваши личные данные
          </Text>
        </Box>

        {/* Форма */}
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <ProfileForm user={{ ...user, avatarUrl }} />
        </Box>
      </VStack>
    </Container>
  )
}
