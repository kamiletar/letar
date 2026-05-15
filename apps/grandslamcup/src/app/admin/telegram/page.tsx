/**
 * Аналитика Telegram-постов и реакций.
 *
 * Показывает все сообщения, отправленные ботом в каналы городов
 * (TelegramMessage), и агрегированные эмодзи-реакции (TelegramReaction),
 * которые подписчики ставят на эти сообщения. Реакции собираются через
 * webhook в `/api/telegram/webhook` (`message_reaction_count` updates).
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { Badge, Box, Container, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export const metadata = {
  title: 'Telegram аналитика — Админ',
}

const TYPE_LABELS: Record<string, string> = {
  announcement: 'Анонс',
  result: 'Результат',
  halfTime: 'Итог тайма',
  schedule: 'Расписание',
  tourSummary: 'Итоги тура',
  voting: 'Голосование',
}

const TYPE_COLORS: Record<string, string> = {
  announcement: 'blue',
  result: 'green',
  halfTime: 'cyan',
  schedule: 'purple',
  tourSummary: 'orange',
  voting: 'pink',
}

/** Загрузить сообщения с реакциями (последние 100) */
const loadMessages = adminGuard(async () => {
  const messages = await prisma.telegramMessage.findMany({
    orderBy: { sentAt: 'desc' },
    take: 100,
    include: {
      reactions: {
        orderBy: { count: 'desc' },
      },
      match: {
        select: {
          id: true,
          homeTeam: { select: { team: { select: { name: true } } } },
          awayTeam: { select: { team: { select: { name: true } } } },
        },
      },
    },
  })
  return { data: messages }
})

export default async function AdminTelegramPage() {
  const result = await loadMessages()
  const messages = 'data' in result ? result.data : []

  // Агрегация по типам — сводка сверху
  const byType = messages.reduce<Record<string, { count: number; reactions: number }>>((acc, msg) => {
    const type = msg.type
    if (!acc[type]) {
      acc[type] = { count: 0, reactions: 0 }
    }
    acc[type].count++
    acc[type].reactions += msg.reactions.reduce((s, r) => s + r.count, 0)
    return acc
  }, {})

  return (
    <Container maxW="6xl" py={6}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl">Telegram аналитика</Heading>
          <Text color="fg.muted" mt={1}>
            Реакции подписчиков на сообщения бота в каналах городов. Данные собираются через webhook.
          </Text>
        </Box>

        {/* Сводка по типам */}
        {Object.keys(byType).length > 0 && (
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={5}>
            <Heading size="md" mb={3}>
              Сводка
            </Heading>
            <HStack gap={6} wrap="wrap">
              {Object.entries(byType).map(([type, stats]) => (
                <VStack key={type} gap={1} align="start">
                  <Badge colorPalette={TYPE_COLORS[type] ?? 'gray'} size="sm">
                    {TYPE_LABELS[type] ?? type}
                  </Badge>
                  <Text fontSize="sm" color="fg.muted">
                    {stats.count} сообщ. · {stats.reactions} реакций
                  </Text>
                </VStack>
              ))}
            </HStack>
          </Box>
        )}

        {/* Таблица сообщений */}
        {messages.length === 0 ? (
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" p={8} textAlign="center">
            <Text color="fg.muted">
              Бот ещё не отправил ни одного отслеживаемого сообщения. Отправьте анонс матча из админки или дождитесь
              автопубликации.
            </Text>
          </Box>
        ) : (
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader>Тип</Table.ColumnHeader>
                  <Table.ColumnHeader>Матч</Table.ColumnHeader>
                  <Table.ColumnHeader>Реакции</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Всего</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {messages.map((msg) => {
                  const totalReactions = msg.reactions.reduce((s, r) => s + r.count, 0)
                  return (
                    <Table.Row key={msg.id}>
                      <Table.Cell>
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(msg.sentAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={TYPE_COLORS[msg.type] ?? 'gray'} size="sm">
                          {TYPE_LABELS[msg.type] ?? msg.type}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {msg.match ? (
                          <Box asChild>
                            <Link href={`/admin/matches/${msg.match.id}`}>
                              <Text fontSize="sm" _hover={{ color: 'brand.solid' }}>
                                {msg.match.homeTeam.team.name} vs {msg.match.awayTeam.team.name}
                              </Text>
                            </Link>
                          </Box>
                        ) : (
                          <Text fontSize="xs" color="fg.muted">
                            —
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {msg.reactions.length === 0 ? (
                          <Text fontSize="xs" color="fg.muted">
                            нет
                          </Text>
                        ) : (
                          <HStack gap={2} wrap="wrap">
                            {msg.reactions.map((r) => (
                              <Text key={r.id} fontSize="sm">
                                {r.emoji} {r.count}
                              </Text>
                            ))}
                          </HStack>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <Text fontWeight={totalReactions > 0 ? 'semibold' : 'normal'}>{totalReactions}</Text>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
