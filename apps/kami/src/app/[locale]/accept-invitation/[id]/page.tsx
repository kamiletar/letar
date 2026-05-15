'use client'

import { authClient } from '@/lib/auth-client'
import { Box, Button, Card, Container, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface InvitationData {
  id: string
  email: string
  organizationId: string
  role: string
  status: 'pending' | 'accepted' | 'rejected' | 'canceled'
  expiresAt: Date
  organization: {
    id: string
    name: string
    slug: string
    logo?: string | null
  }
  inviter: {
    id: string
    user: {
      name: string | null
      email: string
    }
  }
}

/**
 * Страница принятия приглашения в команду
 */
export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  // Получаем данные приглашения
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const result = await authClient.organization.getInvitation({
          query: { id },
        })

        if (result.error) {
          setError('Приглашение не найдено или истекло')
          return
        }

        setInvitation(result.data as unknown as InvitationData)
      } catch (err) {
        console.error('Failed to fetch invitation:', err)
        setError('Не удалось загрузить приглашение')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchInvitation()
    }
  }, [id])

  // Принять приглашение
  const handleAccept = async () => {
    setAccepting(true)
    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId: id,
      })

      if (result.error) {
        setError('Не удалось принять приглашение. Попробуйте войти в систему.')
        return
      }

      // Перенаправляем на страницу опроса
      router.push(`/survey/${invitation?.organization.slug}`)
    } catch (err) {
      console.error('Failed to accept invitation:', err)
      setError('Произошла ошибка при принятии приглашения')
    } finally {
      setAccepting(false)
    }
  }

  // Отклонить приглашение
  const handleReject = async () => {
    setRejecting(true)
    try {
      await authClient.organization.rejectInvitation({
        invitationId: id,
      })

      router.push('/')
    } catch (err) {
      console.error('Failed to reject invitation:', err)
      setError('Произошла ошибка при отклонении приглашения')
    } finally {
      setRejecting(false)
    }
  }

  // Загрузка
  if (loading) {
    return (
      <Container maxW="md" py={20}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="fg.muted">Загрузка приглашения...</Text>
        </VStack>
      </Container>
    )
  }

  // Ошибка
  if (error || !invitation) {
    return (
      <Container maxW="md" py={20}>
        <Card.Root>
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Heading size="lg" color="red.500">
                Ошибка
              </Heading>
              <Text color="fg.muted">{error || 'Приглашение не найдено'}</Text>
              <Button variant="outline" onClick={() => router.push('/')}>
                На главную
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  // Приглашение уже обработано
  if (invitation.status !== 'pending') {
    return (
      <Container maxW="md" py={20}>
        <Card.Root>
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Heading size="lg">Приглашение уже обработано</Heading>
              <Text color="fg.muted">
                Это приглашение было {invitation.status === 'accepted' ? 'принято' : 'отклонено'}.
              </Text>
              <Button variant="outline" onClick={() => router.push('/')}>
                На главную
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Container>
    )
  }

  // Показываем приглашение
  return (
    <Container maxW="md" py={20}>
      <Card.Root>
        <Card.Header>
          <VStack gap={2} textAlign="center">
            <Heading size="xl">Приглашение в команду</Heading>
            <Text color="fg.muted">Вас пригласили принять участие в оценке кандидата</Text>
          </VStack>
        </Card.Header>

        <Card.Body>
          <VStack gap={6}>
            {/* Информация о команде */}
            <Box w="full" p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
              <VStack gap={2} align="start">
                <Text fontWeight="medium" fontSize="lg">
                  {invitation.organization.name}
                </Text>
                <Text color="fg.muted" fontSize="sm">
                  Приглашение от: {invitation.inviter.user.name || invitation.inviter.user.email}
                </Text>
              </VStack>
            </Box>

            {/* Описание */}
            <Text textAlign="center" color="fg.muted">
              После принятия приглашения вы сможете заполнить короткий опрос о работе с кандидатом. Ваши ответы помогут
              будущим работодателям лучше понять его профессиональные качества.
            </Text>

            {/* Кнопки */}
            <HStack gap={4} w="full" justify="center">
              <Button variant="outline" onClick={handleReject} loading={rejecting} disabled={accepting}>
                Отклонить
              </Button>
              <Button colorPalette="brand" onClick={handleAccept} loading={accepting} disabled={rejecting}>
                Принять приглашение
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}
