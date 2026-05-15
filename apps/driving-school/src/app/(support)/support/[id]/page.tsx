import { Badge, Box, Button, Container, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { isOwner } from '@/lib/roles'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'
import { getTicketAction } from '../_actions/support.action'
import { SendMessageForm } from '../_components/send-message-form'
import { TicketActions } from '../_components/ticket-actions'
import { TicketChat } from '../_components/ticket-chat'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '../_schemas/support-ticket.schema'

interface TicketPageProps {
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

export async function generateMetadata({ params }: TicketPageProps) {
  const { id } = await params
  const result = await getTicketAction(id)

  if (!result.success) {
    return { title: 'Обращение не найдено' }
  }

  return {
    title: result.ticket.subject,
    description: 'Просмотр обращения в поддержку',
  }
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/support/${id}`)
  }

  const result = await getTicketAction(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    if (result.error === 'FORBIDDEN') {
      return (
        <Container maxW="container.lg" py={8}>
          <Box layerStyle="panel.error" p={6}>
            <Heading size="lg" color="error.fg">
              Доступ запрещён
            </Heading>
            <Text color="error.fg" mt={2}>
              У вас нет доступа к этому обращению
            </Text>
          </Box>
        </Container>
      )
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
  const isAuthor = ticket.author.id === session.user.id
  const isAdmin = isOwner(session.user.roles)
  const isClosed = ticket.status === 'CLOSED'

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Button asChild variant="ghost" alignSelf="flex-start">
          <Link href="/support">
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
              Создано:{' '}
              {new Date(ticket.createdAt).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
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
        <TicketActions ticketId={ticket.id} status={ticket.status} isAuthor={isAuthor} isAdmin={isAdmin} />

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

        {/* Форма отправки сообщения */}
        <Box>
          <SendMessageForm ticketId={ticket.id} disabled={isClosed} />
        </Box>
      </VStack>
    </Container>
  )
}
