import { Badge, Box, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuMessageSquare, LuPlus } from 'react-icons/lu'

import { getSession } from '@/lib/auth'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'
import { getMyTicketsAction } from './_actions/support.action'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from './_schemas/support-ticket.schema'

export const metadata = {
  title: 'Мои обращения',
  description: 'Список обращений в поддержку',
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

export default async function SupportPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/support')
  }

  const result = await getMyTicketsAction()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
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
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Мои обращения</Heading>
            <Text color="fg.muted" mt={2}>
              История общения с поддержкой
            </Text>
          </Box>

          <Button asChild colorPalette="brand" size="lg">
            <Link href="/support/new">
              <LuPlus />
              Новое обращение
            </Link>
          </Button>
        </Box>

        {/* Список тикетов */}
        {result.tickets.length === 0 ? (
          <Box bg="bg.subtle" p={8} borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={4}>
              У вас пока нет обращений
            </Text>
            <Button asChild colorPalette="brand">
              <Link href="/support/new">Создать обращение</Link>
            </Button>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {result.tickets.map((ticket) => (
              <Link key={ticket.id} href={`/support/${ticket.id}`} style={{ textDecoration: 'none' }}>
                <Box
                  bg="bg.subtle"
                  p={4}
                  borderRadius="lg"
                  _hover={{ bg: 'bg.muted' }}
                  transition="background 0.2s"
                  cursor="pointer"
                >
                  <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <Text fontSize="lg">{CATEGORY_ICONS[ticket.category]}</Text>
                        <Text fontWeight="medium">{ticket.subject}</Text>
                      </HStack>
                      <HStack gap={2} color="fg.muted" fontSize="sm">
                        <Text>{TICKET_CATEGORY_LABELS[ticket.category]}</Text>
                        <Text>•</Text>
                        <Text>
                          {new Date(ticket.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        {ticket._count.messages > 0 && (
                          <>
                            <Text>•</Text>
                            <HStack gap={1}>
                              <LuMessageSquare size={14} />
                              <Text>{ticket._count.messages}</Text>
                            </HStack>
                          </>
                        )}
                      </HStack>
                    </VStack>

                    <Badge colorPalette={STATUS_COLORS[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                  </HStack>
                </Box>
              </Link>
            ))}
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
