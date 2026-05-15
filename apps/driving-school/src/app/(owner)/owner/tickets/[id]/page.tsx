import { Badge, Box, Button, Card, Container, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { isOwner } from '@/lib/roles'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'

import { getTicketDetailsAction } from '../_actions/ticket.action'
import { AssignTicketForm } from '../_components/assign-ticket-form'
import { ReplyForm } from '../_components/reply-form'
import { TicketChat } from '../_components/ticket-chat'
import { UpdateStatusForm } from '../_components/update-status-form'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '../_schemas/ticket.schema'

interface TicketDetailsPageProps {
  params: Promise<{ id: string }>
}

// Цвета для статусов
const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'blue',
  IN_PROGRESS: 'orange',
  RESOLVED: 'green',
  CLOSED: 'gray',
}

// Иконки для категорий
const CATEGORY_ICONS: Record<TicketCategory, string> = {
  HELP: '❓',
  BUG: '🐛',
  FEATURE: '💡',
  OTHER: '📝',
}

export async function generateMetadata({ params }: TicketDetailsPageProps) {
  const { id } = await params
  const result = await getTicketDetailsAction(id)

  if (!result.success) {
    return { title: 'Обращение не найдено' }
  }

  return {
    title: `${result.ticket.subject} - Обращения`,
    description: 'Детали обращения в поддержку',
  }
}

export default async function TicketDetailsPage({ params }: TicketDetailsPageProps) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/owner/tickets/${id}`)
  }

  if (!isOwner(session.user.roles)) {
    redirect('/')
  }

  const result = await getTicketDetailsAction(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    return (
      <Container maxW="container.lg" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить обращение
          </Text>
        </Box>
      </Container>
    )
  }

  const { ticket } = result
  const isClosed = ticket.status === 'CLOSED'

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Button asChild variant="ghost" alignSelf="flex-start">
          <Link href="/owner/tickets">
            <LuArrowLeft />
            Назад к обращениям
          </Link>
        </Button>

        {/* Заголовок */}
        <Box>
          <HStack gap={3} mb={2} flexWrap="wrap">
            <Text fontSize="xl">{CATEGORY_ICONS[ticket.category]}</Text>
            <Heading size="xl">{ticket.subject}</Heading>
            <Badge colorPalette={STATUS_COLORS[ticket.status]} size="lg">
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
          </HStack>

          <HStack gap={3} color="fg.muted" fontSize="sm" flexWrap="wrap">
            <Text>{TICKET_CATEGORY_LABELS[ticket.category]}</Text>
            <Text>•</Text>
            <Text>
              Автор: {ticket.author.name} ({ticket.author.email})
            </Text>
            <Text>•</Text>
            <Text>
              Создано:{' '}
              {new Date(ticket.createdAt).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {ticket.assignedTo && (
              <>
                <Text>•</Text>
                <Text color="brand.solid">Назначено: {ticket.assignedTo.name}</Text>
              </>
            )}
            {ticket.resolvedAt && (
              <>
                <Text>•</Text>
                <Text color="success.fg">
                  Решено:{' '}
                  {new Date(ticket.resolvedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </>
            )}
            {ticket.closedAt && (
              <>
                <Text>•</Text>
                <Text>
                  Закрыто:{' '}
                  {new Date(ticket.closedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </>
            )}
          </HStack>
        </Box>

        {/* Действия */}
        <Card.Root>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between" flexWrap="wrap" gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Изменить статус
                  </Text>
                  <UpdateStatusForm ticketId={ticket.id} currentStatus={ticket.status} />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>
                    Назначить
                  </Text>
                  <AssignTicketForm
                    ticketId={ticket.id}
                    currentAssignedToId={ticket.assignedTo?.id}
                    currentUserId={session.user.id}
                  />
                </Box>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Separator />

        {/* Чат */}
        <Box>
          <TicketChat
            messages={ticket.messages.map((m) => ({
              ...m,
              author: { ...m.author, name: m.author.name || 'Без имени' },
            }))}
            description={ticket.description}
            authorName={ticket.author.name || 'Без имени'}
            authorImage={ticket.author.image}
            createdAt={ticket.createdAt}
            currentUserId={session.user.id}
          />
        </Box>

        <Separator />

        {/* Форма ответа */}
        {!isClosed && (
          <Box>
            <Heading size="md" mb={4}>
              Ответить
            </Heading>
            <ReplyForm ticketId={ticket.id} />
          </Box>
        )}
        {isClosed && (
          <Box bg="bg.subtle" p={4} borderRadius="lg" textAlign="center">
            <Text color="fg.muted">Обращение закрыто. Отправка сообщений невозможна.</Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
