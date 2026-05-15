import { Box, Card, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuCar, LuCircleAlert } from 'react-icons/lu'

import { prisma } from '@/lib/db'

import { JoinSchoolForm } from './_components/join-school-form'

export const metadata = {
  title: 'Активация аккаунта',
  description: 'Активация аккаунта ученика автошколы',
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function JoinSchoolPage({ params }: Props) {
  const { token } = await params

  // Загружаем приглашение
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Проверяем валидность приглашения
  if (!invitation) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
        <Card.Root maxW="md" w="full">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Box color="red.500">
                <LuCircleAlert size={48} />
              </Box>
              <Heading size="lg" color="error.fg">
                Ссылка недействительна
              </Heading>
              <Text color="fg.muted">
                Приглашение не найдено или уже использовано. Обратитесь в автошколу для получения новой ссылки.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    )
  }

  if (invitation.status !== 'pending') {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
        <Card.Root maxW="md" w="full">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Box color="orange.500">
                <LuCircleAlert size={48} />
              </Box>
              <Heading size="lg">Приглашение уже использовано</Heading>
              <Text color="fg.muted">
                Это приглашение уже было принято или отменено. Если у вас есть аккаунт, войдите в систему.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    )
  }

  if (new Date() > invitation.expiresAt) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
        <Card.Root maxW="md" w="full">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Box color="orange.500">
                <LuCircleAlert size={48} />
              </Box>
              <Heading size="lg">Срок действия истёк</Heading>
              <Text color="fg.muted">
                Срок действия приглашения истёк. Обратитесь в автошколу для получения новой ссылки.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    )
  }

  // Проверяем не существует ли уже пользователь
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  })

  if (existingUser) {
    // Пользователь уже существует — просто добавляем в школу
    redirect(`/sign-in?callbackUrl=/join-school/${token}/accept`)
  }

  // Получаем предзаполненные данные
  const metadata = invitation.metadata as { prefillData?: { name?: string; phone?: string } } | null
  const prefillData = metadata?.prefillData || {}

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Card.Root maxW="md" w="full">
        <Card.Header textAlign="center">
          <VStack gap={2}>
            <Box color="blue.500">
              <LuCar size={48} />
            </Box>
            <Heading size="xl">Добро пожаловать!</Heading>
            <Text color="fg.muted">
              Автошкола <strong>{invitation.organization.name}</strong> приглашает вас на обучение
            </Text>
          </VStack>
        </Card.Header>
        <Card.Body>
          <JoinSchoolForm
            token={token}
            email={invitation.email}
            organizationId={invitation.organization.id}
            organizationName={invitation.organization.name}
            prefillName={prefillData.name}
            prefillPhone={prefillData.phone}
          />
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
