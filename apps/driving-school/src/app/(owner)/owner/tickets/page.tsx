import { Badge, Box, Card, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/lib/auth'
import { isOwner } from '@/lib/roles'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'

import { getTicketsListAction } from './_actions/ticket.action'
import { TicketFilters } from './_components/ticket-filters'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from './_schemas/ticket.schema'

export const metadata = {
  title: 'Управление обращениями',
  description: 'Список обращений пользователей в поддержку',
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

interface TicketsPageProps {
  searchParams: Promise<{
    status?: TicketStatus | 'all'
    category?: TicketCategory | 'all'
    search?: string
  }>
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/owner/tickets')
  }

  if (!isOwner(session.user.roles)) {
    redirect('/')
  }

  const params = await searchParams
  const filters = {
    status: params.status || 'all',
    category: params.category || 'all',
    search: params.search,
  }

  const result = await getTicketsListAction(filters)

  if (!result.success) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box layerStyle="panel.error" p={6}>
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить обращения
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Управление обращениями</Heading>
          <Text color="fg.muted" mt={2}>
            Всего обращений: {result.totalCount}
          </Text>
        </Box>

        {/* Фильтры */}
        <Suspense fallback={<Box>Загрузка фильтров...</Box>}>
          <TicketFilters currentFilters={filters} />
        </Suspense>

        {/* Список тикетов */}
        {result.tickets.length === 0 ? (
          <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted">Нет обращений</Text>
          </Box>
        ) : (
          <Card.Root>
            <Card.Body p={0}>
              <Box overflowX="auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--chakra-colors-border)' }}>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Тема
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Автор
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Категория
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Статус
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Дата создания
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--chakra-colors-fg-muted)',
                        }}
                      >
                        Сообщений
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        style={{
                          borderBottom: '1px solid var(--chakra-colors-border)',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <HStack gap={2}>
                              <Text fontSize="lg">{CATEGORY_ICONS[ticket.category]}</Text>
                              <Box>
                                <Text fontWeight="medium" lineClamp={1}>
                                  {ticket.subject}
                                </Text>
                                {ticket.assignedTo && (
                                  <Text fontSize="xs" color="fg.muted">
                                    Назначено: {ticket.assignedTo.name}
                                  </Text>
                                )}
                              </Box>
                            </HStack>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <Box>
                              <Text fontWeight="medium">{ticket.author.name}</Text>
                              <Text fontSize="sm" color="fg.muted">
                                {ticket.author.email}
                              </Text>
                            </Box>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <Text fontSize="sm">{TICKET_CATEGORY_LABELS[ticket.category]}</Text>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <Badge colorPalette={STATUS_COLORS[ticket.status]}>
                              {TICKET_STATUS_LABELS[ticket.status]}
                            </Badge>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <Text fontSize="sm" color="fg.muted">
                              {new Date(ticket.createdAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/owner/tickets/${ticket.id}`}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <Text fontSize="sm" textAlign="center">
                              {ticket._count.messages}
                            </Text>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  )
}
