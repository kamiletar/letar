import { getInvitation } from '@/app/(instructor)/students/invite/_actions/invite.action'
import { getSession } from '@/lib/auth'
import { Box, Container, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { InviteActions } from './_components/invite-actions'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const session = await getSession()
  const result = await getInvitation(token)

  if (!result.success) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Приглашение не найдено
            </Heading>
            <Text color="error.fg" mt={2}>
              Возможно, ссылка устарела или была введена неправильно.
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  const { invitation } = result

  if (invitation.status === 'EXPIRED') {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.warning" p={6} textAlign="center">
            <Heading size="lg" color="warning.fg">
              Приглашение истекло
            </Heading>
            <Text color="warning.fg" mt={2}>
              Срок действия этого приглашения закончился. Попросите инструктора отправить новое приглашение.
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.success" p={6} textAlign="center">
            <Heading size="lg" color="success.fg">
              Приглашение уже принято
            </Heading>
            <Text color="success.fg" mt={2}>
              Вы уже связаны с этим инструктором.
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  if (invitation.status === 'DECLINED') {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          <Box bg="bg.muted" p={6} borderRadius="lg" borderWidth="1px" borderColor="border.muted" textAlign="center">
            <Heading size="lg" color="fg">
              Приглашение отклонено
            </Heading>
            <Text color="fg.muted" mt={2}>
              Это приглашение было отклонено.
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  // Приглашение в статусе PENDING
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Box textAlign="center">
          <Heading size="xl">Приглашение от инструктора</Heading>
          <Text color="fg.muted" mt={2}>
            {invitation.instructorName || 'Инструктор'} приглашает вас стать учеником
          </Text>
        </Box>

        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <VStack gap={4} align="stretch">
            <Box>
              <Text fontWeight="bold">Инструктор</Text>
              <Text color="fg.muted">{invitation.instructorName || 'Имя не указано'}</Text>
            </Box>

            <Box>
              <Text fontWeight="bold">Действительно до</Text>
              <Text color="fg.muted">{formatDate(invitation.expiresAt)}</Text>
            </Box>

            {!session?.user ? (
              <Box layerStyle="panel.warning" p={4}>
                <Text color="warning.fg" fontSize="sm">
                  Чтобы принять приглашение, необходимо войти в систему или зарегистрироваться как ученик.
                </Text>
                <HStack mt={3} gap={2}>
                  <Link
                    href={`/sign-in?callbackUrl=/join-instructor/${token}`}
                    bg="fg.solid"
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="md"
                    textAlign="center"
                    flex={1}
                    fontSize="sm"
                    fontWeight="medium"
                    _hover={{ bg: 'fg.solid/90' }}
                  >
                    Войти
                  </Link>
                  <Link
                    href={`/sign-up?callbackUrl=/join-instructor/${token}`}
                    borderWidth="1px"
                    borderColor="border.muted"
                    px={4}
                    py={2}
                    borderRadius="md"
                    textAlign="center"
                    flex={1}
                    fontSize="sm"
                    fontWeight="medium"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    Регистрация
                  </Link>
                </HStack>
              </Box>
            ) : (
              <InviteActions token={token} />
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
